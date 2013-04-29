var MM = {};
var log = function(s){ console.log(s) };

MM.init = function(el, events, fleet) {
	
	//-- expects a element it
	MM.$el = $("#"+el);

	MM.width = MM.$el.width();
	MM.height = MM.$el.height();
	
	MM.events = events;
	MM.fleet = fleet;
	
	MM.$tip = $("#tip");
	MM.$tipTxt = MM.$tip.find("#tip-content");
	
	//-- Setup canvas
	MM.r = Raphael(el, MM.width, MM.height);
	
	//-- Get events
	MM.events = MM.distributeEvents(events);
	
	//-- Create routes
	MM.routes = MM.map(MM.fleet);
	
	MM.timeline($("#timeline"), 8);
	
	MM.start();
	
	MM.menu($("#menu"));
	
	
	
	
}

MM.timeline = function($el, num_ticks) {
	var num_ticks = num_ticks || 3,
		start_year = MM.events[0].y, //-- First event
		end_year = MM.events[MM.events.length-1].y, //-- Last event
		timeSpan = end_year - start_year,
		timeStep = timeSpan / (num_ticks-1),
		offset = 20, //- offset
		pxStep = Math.floor((MM.width - offset ) / num_ticks),
		ticks = []; //-- pixel change per year
	
	
	ticks.push($("<li>"+start_year+"</li>").css("left", offset));

	for ( var i = 1; i <= num_ticks-2; i++ ) {
		var tick = $("<li>"+Math.round(start_year + timeStep * i)+"</li>");
		tick.css("left", offset + (pxStep * i));
		ticks.push(tick);
	}
	
	ticks.push($("<li>"+end_year+"</li>").css("left", MM.width - offset - 180));
	
	$el.append(ticks);

}
MM.distributeEvents = function(events) {
	
	cleaned = [];
	
	//-- Clean events from google-docs to shorthand
	events.forEach(function(e){
		//if(e["Use"] != "x") return;
		
		if(!e["Image"]) return;
		
		var strim = function(s) {
			r = [];
			l = s.split(",");
			l.forEach(function(i){
				r.push(i.trim());
			});
			return r;
		}

		var item = {
			"y" : parseInt(e["Year"]),
			"m" : e["Month"],
			"d" : e["Day"],
			"v" : strim(e["Type of Vehicle"]),
			"desc" : e["Event Description"],
			"img" : "photos/" + e["Image"],
			"source" : e["Source"]
		}
			
		cleaned.push(item);
	});
	
	//-- Sort events by year
	events = cleaned.sort(MM.compare);
	
	//-- Split events off into each fleet vehicle
	events.forEach(function(e){
		
		e.v.forEach(function(v){
			//console.log(v)
			MM.fleet[v].events.push(e);
		});
		
	});
	
	return events;
}

MM.compare = function(a,b) {
  if (a.y < b.y)
	 return -1;
  if (a.y > b.y)
	return 1;
  return 0;
}



MM.map = function(fleet) {

	var routes = {},
		num_events = MM.events.length,
		start_year = MM.events[0].y, //-- First event
		end_year = MM.events[num_events-1].y, //-- Last event
		timeSpan = end_year - start_year,
		right = 0, //- offset
		pxStep = Math.floor((MM.width - right ) / timeSpan); //-- pixel change per year
	for (v in MM.fleet) {
		route = MM.fleet[v];
		
		if(!route.events.length) return;
		
		MM.plot(v, start_year, pxStep );
		
		MM.drawRoute(v);
		
	};
	
	return routes;
}

MM.plot = function(v, start_year, pxStep) {
	var route = MM.fleet[v],
		events = route.events,
		s_height = route.s_height,
		points = [],
		left = 20, //-- offset
		height = MM.height - MM.height * (s_height / 100), //-- reverse grid and plot by %
		path,
		dir = 0,
		reset = false,
		stops = {};
	
	events.forEach(function(e, i){
		var p = 0; 
		
		if(i + 1 < events.length && (events[i+1].y - events[i].y == 1)) {
			p = pxStep * dir;
			
			if(height + p > MM.height - 20) {
				p = p * -1;
			}
			
			if(height + p - 20 < 0) {
				p = p * -1;
			}
			
		}
		
		if(i + 1 < events.length && (events[i+1].y - events[i].y > 2)) {
			p = dir * Math.random()*60; //(e.pos >= 0 ? e.pos : Math.random()*20);
			
			
			if(height + p > MM.height - 20) {
				p = p * -1;
			}
			
			if(height + p - 20 < 0) {
				p = p * -1;
			}
			
			
			
			reset = true;
			
			
		}else if(reset){
			dir = (Math.random() < 0.5 ? -1 : 1);
			reset = false;
		}
		
		
		point = { 
					x: left + pxStep * (e.y - start_year), 
					y: height + p,
					c: e.c
				};
		
		height = height + p;
		
		e.point = point;
		
		stops[point.x] = i;
		
		points.push(point);
		//log( point )
		//log(events)
			
	});

	
	path = MM.generateInterpolatedPath( MM.r, points);
	
	route.points = points;
	
	route.path = path;
	
	route.xstops = stops;
	 
	return path;
}

MM.toggleRoute = function(v) {
	var route = MM.fleet[v],
		delay = 50,
		glowSettings = {
			width: 5,
			color: "#000000",
			opacity : .5,
			offsetx : 0,
			offsety : 0
		};
	
	if(!route.shown) {
		
		//-- quick in
		if(route.shown == false) delay = 0;
		
		route.line.show();
		
		route.glow = route.line.glow(glowSettings);
		
		route.stops.forEach(function(stop, i) {
			//setTimeout(function(){
				stop.show();
		//	}, delay * i);
		});
		
		
		route.shown = true;
	}else{
		route.line.hide();
		
		route.stops.forEach(function(stop) {
			stop.hide();
		});
		
		route.glow.remove();
		
		route.shown = false;
	}
	
}

MM.drawRoute = function(v) {
	var route = MM.fleet[v],
		path = route.path,
		events = route.events,
		stops = [],
		color = route.color || Raphael.getColor();
		
	//-- Draw the line path
	route.line = MM.r.path( path )
					.attr( { stroke: color, 'stroke-width': 6, fill: 'none' } )
					.hide();
					
	
	
	if(!events) return;
	
	//-- Draw event points
	events.forEach(function(e, i){
		var t, lock;
		
		c = MM.r.circle( e.point.x, e.point.y, 7 )
			.attr( { fill: "white", stroke: color , 'stroke-width': 4 } )
			.hover(function () {
		   		if(lock) return;
		   		lock = true;
		   		
		   		this.attr( { fill: color } );
		   		
		   		
		   		MM.tip(this, [e.m, e.d+",", e.y].join(" "), e.v, e.desc);
		   		
		   		MM.bg(e.img);
		   		
		   		clearTimeout(t);
		   		
			}, function() { 
				var that = this;
				t = setTimeout(function(){					
					that.attr( { fill: "white" } );
					MM.$tip.hide();
					lock = false;
				}, 450);
				
				
			} )
			.hide();	
		//c.glow(glowSettings);
		
		stops.push(c);
	});
	
	route.stops = stops;
}


MM.tip = function(el, title, type, desc) {
	var $el = $(el[0]);
	if(!$el.length) return;
	
	//-- set content
	MM.$tipTxt.html("<h3>"+title+"</h3>"+"<p>"+desc+"<p>");
	//-- locations of station
	rect = $el.offset();
	
	//-- position the popup
	//MM.$tip.css("left", rect.left - MM.$tip.width() / 2 );
	MM.$tip.css("left", rect.left );
	MM.$tip.css("top", rect.top + "px" );
	
	MM.$tip.show();
	
	//console.log(rect.left, rect.top)
}

MM.bg = function(url) {
	
	if(!MM.$bg) {
		MM.$bg = $("#bg");
	}
	
	MM.$bg.fadeOut(400, function(){
		
		MM.$bg.css("background-image", "url("+url+")");	
		MM.$bg.fadeIn(800);
		
	});	
	
}

// MM.generateInterpolatedPath = function(points) {
// 	var path_sequence = [];
// 	path_sequence.push( "M", points[0].x, points[0].y );
// 	//path_sequence.push( "R" );
// 	for ( var i = 1; i < points.length; i++ )
// 	{
// 		path_sequence.push( points[i].x, points[i].y );
// 	}
// 	return path_sequence;
// }

MM.generateInterpolatedPath = function( paper, points ) {
	var path_sequence = [];
	
	path_sequence.push( "M", points[0].x, points[0].y );
	//path_sequence.push( "R" );
	
	
	

	for ( var i = 1; i < points.length; i++ ) {
		
		
		
		if(points[i].c) {

			path_sequence.push( "C" );
			
			if(points[i].c == "+") {
				path_sequence.push( points[i-1].x + 30, points[i-1].y );
				path_sequence.push( points[i].x, points[i-1].y );
			}else if(points[i].c == "-") {
				path_sequence.push( points[i-1].x + 30, points[i].y );
				path_sequence.push( points[i].x, points[i].y );
			}
			
			path_sequence.push( points[i].x, points[i].y );
			
			
			path_sequence.push( "M" );
			
			

		}
		

		path_sequence.push( points[i].x, points[i].y );

			
	}
	
	
	
	
	return path_sequence;
}

MM.travel = function(line) {
	var route =  MM.fleet[line],
		config = { stroke: 'white', fill: 'none', 'fill-opacity': 0, 'stroke-width': 4},
		plen = route.points.length,
		cur = 0,
		delay = 4000;
	
	var get_path = function(p){
		return "M"+route.points[cur].x+","+route.points[cur].y+"L"+route.points[cur+1].x+","+route.points[cur+1].y;	
	}
	
	var show_stop = function() {
	
		MM.showStation("Cable Car", cur);
		
		
		if(cur >= plen) return;
		
		MM.drawpath( MM.r, get_path(cur), delay, config, function(){
			
				show_stop();
			
		});
		
		cur++
		
	}
	
	show_stop(0);
	
	
	
	//var dpath = MM.drawpath( MM.r, MM.fleet[line].path, MM.width * 100, { stroke: 'white', fill: 'none', 'fill-opacity': 0, 'stroke-width': 4});
}


MM.showStation = function(v, station) {
	var e = MM.fleet[v].events[station],
		s = MM.fleet[v].stops[station];

	MM.tip(s, [e.m, e.d+",", e.y].join(" "), e.v, e.desc);
	
	MM.bg(e.img);
	$("#source").html(e.source).attr("href", e.source);
}

MM.drawpath = function( canvas, pathstr, duration, attr, callback ) {
	
	var guide_path = canvas.path( pathstr ).attr( { stroke: "none", fill: "none" } );
	var path = canvas.path( guide_path.getSubpath( 0, 1 ) ).attr( attr );
	var total_length = guide_path.getTotalLength( guide_path );
	var last_point = guide_path.getPointAtLength( 0 );
	var start_time = new Date().getTime();
	var interval_length = 50;
	var result = path;        
	var prevStation = 0;
	var p = 1000;
	
	//MM.showStop("Cable Car", 0);
	
	var interval_id = setInterval( function()
	{
		var elapsed_time = new Date().getTime() - start_time;
		var this_length = elapsed_time / duration * total_length;
		var subpathstr = guide_path.getSubpath( 0, this_length );            
		attr.path = subpathstr;
		
		// var curr = guide_path.getPointAtLength( this_length );
		// var station = MM.fleet["Cable Car"].xstops[Math.round(curr.x)];
		// //log(MM.fleet["Cable Car"].xstops)
		// if(station && station != prevStation) {
		// 	console.log("stop", station)
		// 	MM.showStop("Cable Car", station);
		// 	
		// 	prevStation = station;
		// }

		path.animate( attr, interval_length );
		if ( elapsed_time >= duration )
		{
			clearInterval( interval_id );
			if ( callback != undefined ) callback();
			guide_path.remove();
		}                                       
	}, interval_length );  
	return result;
}

MM.start = function() {
	var $s = $("#start"),
		$intro = $("#intro"),
		$title = $("#titlecard"),
		$shape = $("#bgshape"),
		$menu = $("#menu"),
		$timeline = $("#timeline");
		
		MM.bg("/photos/misc/intro-light.jpg");
		
		$shape.addClass("show");
		$intro.addClass("show");
		$title.addClass("show");
		
		
		$s.on("click", function(e) {
			$intro.removeClass("show");
			$title.removeClass("show");
			$shape.removeClass("show");
			
			
			$intro.addClass("closed");
			$title.addClass("closed");
			$shape.addClass("closed");
			
			$menu.addClass("show");
			$timeline.addClass("show");
			
			setTimeout(function(){
				f = $menu.find("a")[0];
				$(f).trigger("click");
			}, 2800);		
			
			
			e.preventDefault();
		})
		
		setTimeout(function(){
			$(document).on("keyup", function(e) {
				if(e.which == 13) {
					$s.trigger("click");
				}
			});
		}, 1000); //-- wait for page to load to prevent accidental trigger
}

MM.menu = function($el) {
	for (v in MM.fleet) {
		var id = v.replace(' ', '_'),
			b = $("<a href='#"+id+"' id='toggle-"+id+"' class='off' style='background-color: "+MM.fleet[v].color+"' data-v='"+v+"'>"+v+"</a>");
			
		if(!MM.fleet[v].events.length) return;
		
		b.on("click", function(e){
			var $this = $(this),
				name = $this.data("v");

			MM.toggleRoute(name);
			
			//-- Travel down route
			//if(name == "Cable Car") MM.travel(name);
			
			if($this.hasClass("off")) {
				$this.removeClass("off");
			}else{
				$this.addClass("off");
			}
			
			e.preventDefault();
		});
		
		$el.append(b);
	};
}

//-- http://jsfiddle.net/rwaldron/j3vST/
//-- var result = findById( myArray, 45 );
MM.findById = function(source, id) {
	return source.filter(function( obj ) {
		// coerce both obj.id and id to numbers 
		// for val & type comparison
		return +obj.id === +id;
	})[ 0 ];
}
