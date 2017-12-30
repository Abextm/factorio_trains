var lim = function(num,lim){
	num=Number.parseFloat(num)+(Math.pow(10,-lim)/2);
	num=num+"";
	var idx = num.indexOf(".");
	if(idx!=-1){
		num=num.substr(0,idx+(~~lim)+1);
	}
	return num;
};
angular.module('factorioTrainApp',[]).filter('lim',function(){
	return lim;
}).controller('TrainController',["$scope","limFilter",function($scope,lim){
	window.TrainController=this;
	this.allWagons = {
		"Diesel Locomotive":{
			weight:2000,
			max_speed:1.2,
			max_power:600,
			reversing_power_modifier:0.6,
			braking_force:10,
			friction_force:.5,
			air_resistance:.0075,
			fuel_acceleration_multiplier:1.0,
			fuel_top_speed_multiplier:1,
			mover:1,
		},
		"Diesel Locomotive + Solid fuel":{
			weight:2000,
			max_speed:1.2,
			max_power:600,
			reversing_power_modifier:0.6,
			braking_force:10,
			friction_force:.5,
			air_resistance:.0075,
			fuel_acceleration_multiplier:1.2,
			fuel_top_speed_multiplier:1.05,
			mover:1,
		},
		"Diesel Locomotive + Rocket fuel":{
			weight:2000,
			max_speed:1.2,
			max_power:600,
			reversing_power_modifier:0.6,
			braking_force:10,
			friction_force:.5,
			air_resistance:.0075,
			fuel_acceleration_multiplier:1.8,
			fuel_top_speed_multiplier:1.15,
			mover:1,
		},
		"Diesel Locomotive + Nuclear fuel":{
			weight:2000,
			max_speed:1.2,
			max_power:600,
			reversing_power_modifier:0.6,
			braking_force:10,
			friction_force:.5,
			air_resistance:.0075,
			fuel_acceleration_multiplier:2.5,
			fuel_top_speed_multiplier:1.15,
			mover:1,
		},
		"Cargo Wagon":{
			weight:1000,
			max_speed:1.5,
			braking_force:3,
			friction_force:.5,
			air_resistance:.01,
		},
		"Fluid Wagon":{
			weight:1000,
			max_speed:1.5,
			braking_force:3,
			friction_force:.5,
			air_resistance:.01,
		},
		"Artillery Wagon":{
			weight:4000,
			max_speed:1.5,
			braking_force:3,
			friction_force:.5,
			air_resistance:.015,
		},
	};

	{
		Object.keys(this.allWagons).forEach(n=>{
			var w = this.allWagons[n];
			if(w.mover){
				var dup=JSON.parse(JSON.stringify(w))
				dup.mover=-1;
				this.allWagons["Backwards "+n]=dup;
			}
		});
		Object.keys(this.allWagons).forEach(name=>{
			this.allWagons[name].name=name;
			this.allWagons[name].image=name.toLowerCase().replace(" ","_")+".png";
		});
		var defaultWagons = ["Diesel Locomotive","Cargo Wagon","Cargo Wagon","Cargo Wagon","Backwards Diesel Locomotive"].map(v=>this.allWagons[v]);
		var hashWagons = window.location.hash.substr(1).split(",").map(v=>this.allWagons[v]);
		this.wagons=hashWagons.some(v=>!v)?defaultWagons:hashWagons;
	}
	this.addWagon=_=>{
		this.wagons.push(this.allWagons[this.newWagon])
	};
	this.newWagon="Cargo Wagon";
	this.removeWagon=idx=>{
		this.wagons.splice(idx,1);
	};
	this.upWagon=idx=>{
		if(idx==0) return;
		if(idx==this.wagons.length) return;
		var tmp=this.wagons[idx-1];
		this.wagons[idx-1]=this.wagons[idx];
		this.wagons[idx]=tmp;
	}
	this.downWagon=idx=>{
		this.upWagon(idx-1);
	}
	this.brakingForceLevel=0;
	var calcSpeed=(direction,braking)=>{
		return speed=>{
			if(braking) {
				speed-=Math.min(Math.abs(speed),this.brakingForce/this.weight);
			} else {
				speed-=Math.min(speed,this.frictionForce/this.weight);
				speed+=(direction.power/this.weight)/1000;
				speed*=1-(this.airResistance/(this.weight/1000));
			}
			return Math.max(-direction.maxSpeed,Math.min(direction.maxSpeed,speed));
		};
	};
	this.forward={};
	this.backward={};
	this.updateNumbers = _=>{
		if(history){
			history.replaceState(undefined,undefined,"#"+this.wagons.map(w=>w.name).join(","));
		}
		//research
		var brakingForceUpgrade=0
		if(this.brakingForceLevel){
			brakingForceUpgrade=.1+((this.brakingForceLevel-1)*.15); //xcheck: ok
		}
		//guess
		var frontMovers=this.wagons.filter(w=>w.mover==1);
		var backMovers=this.wagons.filter(w=>w.mover==-1);
		//Train::updateBrakingForce()
		this.brakingForce=this.wagons.reduce((acc,w)=>acc+((brakingForceUpgrade+1)*w.braking_force),0) //xcheck: ok
		//Train::updateMaxSpeed()
		var calcMaxSpeed=movers=>{
			var maxSpeed = this.wagons.reduce((acc,w)=>acc>w.max_speed?w.max_speed:acc,99999);
			return maxSpeed*(movers.reduce((acc,w)=>acc+w.fuel_top_speed_multiplier,0)/movers.length);
		};
		this.forward.maxSpeed=calcMaxSpeed(frontMovers); //xcheck: ok
		this.backward.maxSpeed=calcMaxSpeed(backMovers);
		//Train::setup()
		this.weight=this.wagons.reduce((acc,w)=>w.weight+acc,0); //xcheck: ok
		this.frictionForce=this.wagons.reduce((acc,w)=>w.friction_force+acc,0); //xcheck: ok
		this.airResistance=this.wagons.length?this.wagons[0].air_resistance:0; //xcheck: ok
		//Train::updateSpeed()
		var calcPower=locos=>locos.reduce((acc,w)=>acc+(w.fuel_acceleration_multiplier*w.max_power*(50/3)),0);//xcheck: bad max_power
		this.forward.power=calcPower(frontMovers);
		this.backward.power=calcPower(backMovers);
		var simulateSpeed=(bcs,speed)=>{
			var tick=0;
			var dist=0;
			for(;tick<216000;tick++){
				var lastSpeed=speed;
				dist+=speed;
				speed=bcs(speed);
				if(lastSpeed==speed){
					break;
				}
			}
			return {
				accelDistance:dist,
				actualSpeed:speed,
				accelTime:tick,
			};
		};
		var doSim=direction=>{
			var r = simulateSpeed(calcSpeed(direction,false),0);
			direction.accelDistance=r.accelDistance;
			direction.actualSpeed=r.actualSpeed;
			direction.accelTime=r.accelTime;
			var r = simulateSpeed(calcSpeed(direction,true),r.actualSpeed);
			direction.decelDistance=r.accelDistance;
			direction.decelTime=r.accelTime;
		};
		doSim(this.forward);
		doSim(this.backward);
		var doNice=d=>{
			d.maxSpeedNice=lim(216*d.maxSpeed,1);
			d.accelTimeNice=lim(d.accelTime/60,1);
			d.accelTilesNice=lim(d.accelDistance,1);
			d.decelTimeNice=lim(d.decelTime/50,1);
			d.decelTilesNice=lim(d.decelDistance,1);
		}
		doNice(this.forward);
		doNice(this.backward);
	};
	$scope.$watchCollection(s=>this.wagons,this.updateNumbers);
	$scope.$watch(s=>this.brakingForceLevel,this.updateNumbers);
}]);