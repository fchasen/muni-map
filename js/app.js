"use strict";

var MM = {};
var log = function(s){ console.log(s) };

MM.init = function(el, events, fleet, ends) {
	var offset = 60;
	//-- expects a element it
	MM.$el = $("#"+el);

	MM.width = MM.$el.width() + offset;
	MM.height = MM.$el.height();
	
	MM.events = events;
	MM.fleet = fleet;
	MM.ends = ends;
	
	MM.$tip = $("#tip");
	MM.$tipTxt = MM.$tip.find("#tip-content");
	
	MM.$end = $("#end");
	
	//-- Setup canvas
	MM.r = Raphael(el, MM.width, MM.height);
	
	//-- Get events
	MM.events = MM.distributeEvents(events);
	
	//-- Create routes
	MM.routes = MM.map(MM.fleet);
	
	MM.timeline($("#timeline"), 9);
	
	MM.start();
	
	MM.menu($("#menu"));
	
	
	
	
}

MM.timeline = function($el, num_ticks) {
	var num_ticks = num_ticks || 3,
		start_year = MM.events[0].y, //-- First event
		end_year = MM.events[MM.events.length-1].y, //-- Last event
		timeSpan = end_year - start_year,
		timeStep = timeSpan / (num_ticks-2),
		offset = 0, //- offset
		halfw = 8,
		pxStep = Math.floor(($el.width() - offset ) / num_ticks),
		ticks = [], //-- pixel change per year,
		needsEnd = true; 

	//console.log("time", start_year, end_year, timeSpan, MM.width/timeSpan, pxStep, (pxStep * num_ticks-1));

	ticks.push($("<li>"+start_year+"</li>").css("left", offset ));

	for ( var i = 1; i <= num_ticks-2; i++ ) {
		var y = Math.round(start_year + timeStep * i),
			tick = $("<li>"+y+"</li>");
		
			tick.css("left", offset + (pxStep * i) - (halfw * i));
			ticks.push(tick);
			
		if(y != end_year){
			needsEnd = false;
		}
	}
	
	if(needsEnd) {
		ticks.push($("<li>"+end_year+"</li>").css("left", offset + (pxStep * num_ticks-1) - halfw));
	}
	
	
	$el.append(ticks);

}
MM.distributeEvents = function(events) {
	
	var cleaned = [];
	
	//-- Clean events from google-docs to shorthand
	events.forEach(function(e){
		//if(e["Use"] != "x") return;
		
		if(!e["Image"]) return;
		
		var strim = function(s) {
			var r = [];
			var l = s.split(",");
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
	
	MM.end_year = 2020;//events[events.length-1].y;
	
	//-- Split events off into each fleet vehicle
	events.forEach(function(e){
		
		e.v.forEach(function(v){
			//console.log(v)
			MM.fleet[v].events.push({
				"y" : e.y,
				"m" : e.m,
				"d" : e.d,
				"desc" : e.desc,
				"img" : e.img,
				"source" : e.source
			});
		});
		
	});
	
	//-- Add in End screens
	for (var v in MM.ends) {
		
		var e = MM.ends[v],
			route = MM.fleet[v];
		
		route.events.push({
			"y" : MM.end_year,
			"end" : true,
			"name" : route.name,
			"overview" : e.overview,
			"next" : e.next,
			"links" : e.links.split(','),
			"stat1" : e.stat1.split(':'),
			"stat2" : e.stat2.split(':'),
			"img" : route.img
		});			
		
	}
	
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
	//console.log("map", start_year, end_year, timeSpan, MM.width/timeSpan, pxStep, pxStep * (2013-start_year));
	MM.paused = {};
	
	for (var v in MM.fleet) {
		var route = MM.fleet[v];
		
		if(!route.events.length) return;
		
		MM.paused[v] = 0;
		
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
		leftOffset = 20, //-- offset
		rad = 6,
		height = MM.height - MM.height * (s_height / 100), //-- reverse grid and plot by %
		path,
		dir = 0,
		reset = false,
		stops = {};
	
	
	route.rpath.forEach(function(e, i){
		var x = e[0],
			y = e[1],
			top = MM.height * (y / 100),
			left = pxStep * (x - start_year);
		
		points.push({ x: leftOffset + left, y: top});

			
	});
	
	path = MM.generateInterpolatedPath( MM.r, points);

	var epoints = [];
	
	// var guide = MM.r.path(path).attr( { stroke: "none", fill: "none" } );
	// var total_length = guide.getTotalLength( guide );
	// var plength = 0;
	// 
	// route.guide = guide;
	// 
	// var sliceup = function(x,y) {
	// 	var r = false;
	// 	var seg = route.guide.getSubpath( plength, total_length );
	// 	var len = Raphael.getTotalLength(seg);
	// 	var chunk = Math.ceil(len / 1000);
	// 	
	// 	for (var i=0; i < len; i+=chunk) {
	// 		var p = guide.getPointAtLength( i );
	// 		//console.log(x, y, p.x, p.y)
	// 		if(Math.round(p.x) == x && Math.round(p.y) == y) {
	// 			r = i; 
	// 			break;
	// 		}
	// 	}
	// 	
	// 	return r;
	// 	
	// }
	
	route.events.forEach(function(e, i){
		var left = leftOffset + pxStep * (e.y - start_year),
			inter = Raphael.pathIntersection("M"+left+",0 L"+left+","+MM.height, path),
			top,
			prev = (i-1) > 0 ? route.events[i-1] : false,
			twists = ["M"],
			point;
		
		if(prev) {
			var px = prev.point.x;
			//console.log(prev)

/*
			if(left - px < 8) {
				left = px + 14;
				inter = Raphael.pathIntersection("M"+left+",0 L"+left+","+MM.height, path)
			}
*/
		}
				
		if(!inter[0]) { 
			//console.log("No Intersection", v, e.y, left, path); 
			if(left <= path[1]) { 
				top = path[2];
			}else if(left >= path[path.length - 2]) {
				top = path[path.length - 1];
			}
		}else{
			top = inter[0].y;
		}
		//console.log(left, path[1], inter[0].x)
		
		//console.log("slice:", sliceup(Math.round(inter[0].x), Math.round(inter[0].y)) );
		point = { 
					x: left, 
					y: top
				};
		
		e.point = point;
				
		if(prev) {
			twists.push(prev.point.x, prev.point.y, "L");
		}
		
		
		for (var j=0; j < route.rpath.length; j++) {
			
			var year = route.rpath[j][0];
			
			if(year >= e.y) break;
			
			if(year >= prev.y) {
				twists.push(points[j].x, points[j].y);
				//console.log(points[j].x, points[j].y)
			}
		}
		
		twists.push( left, top );
		

		e.slice = twists;

		//console.log(point)
		stops[point.x] = i;
		
		epoints.push(point);
		//log( point )
		//log(events)
	});
	
	
	route.points = epoints;
	
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
		
		route.stops.show();
		
		
		route.shown = true;
	}else{
		route.line.hide();
		
		route.stops.forEach(function(stop) {
			stop.hide();
		});
		
		route.glow.remove();
		
		if(v == MM.traveling) MM.stop(v);


		route.shown = false;
	}
	
}

MM.drawRoute = function(v) {
	var route = MM.fleet[v],
		path = route.path,
		events = route.events,
		stops = MM.r.set(),
		color = route.color || Raphael.getColor(),
		$tip = $("#tip"),
		$src = $("#source");
		
	//-- Draw the line path
	route.line = MM.r.path( path )
					.attr( { stroke: color, 'stroke-width': 6, fill: 'none' } )
					.hide();
					
	
	
	if(!events) return;
	
	function makeCircle(x, y, onhover) {
		var t, lock,
		    cs = MM.r.set(),
			c = MM.r.circle( x, y, 7 ).attr( { fill: "white", stroke: color , 'stroke-width': 3} ),
			hit = MM.r.circle( x, y, 12 ).attr({stroke: "none", fill: "transparent" });
		
		cs.push(c, hit);
		
		hit.hover(function () {
		   		if(lock) return;
		   		lock = true;
			
		   		c.attr( { fill: color } );
		   		
		   		if(MM.traveling) MM.pause(MM.traveling);
		   		
		   		onhover(c);
		   		
		   		
		   		clearTimeout(t);
		   		
		   		
		   		
		   		
		   		
			}, function() { 
				t = setTimeout(function(){					
					c.attr( { fill: "white" } );
					//MM.$tip.hide();
					lock = false;
				}, 50);
				
				
			} );
		
		// $tip.on("mouseenter", function(){
		// 	clearTimeout(t);
		// });
		// 
		// $tip.on("mouseleave", function(){
		// 	t = setTimeout(function(){					
		// 		c.attr( { fill: "white" } );
		// 		MM.$tip.hide();
		// 		lock = false;
		// 	}, 250);
		// });
		
		cs.hide();	
		
		hit.node.setAttribute('class',  'station');
		
		return cs;
	}
	
	//-- Draw event points
	events.forEach(function(e, i){
		var s;
		
		if(!e.end) {
			
			s = makeCircle(e.point.x, e.point.y, function(c){
				
				MM.tip(c, [e.m, e.d+",", e.y].join(" "), e.v, e.desc);
				
				$src.attr("href", e.source);
				
				MM.bg(e.img);
				
			});
			
		}else{
			
			s = makeCircle(e.point.x, e.point.y, function(c){
				
				MM.end(c, e.name, e.overview, e.next, e.links, e.stat1, e.stat2, e.img);
				
			});
			
		}
		//c.glow(glowSettings);
		
		//stops.push(c);
		stops.push(s)
	});
	
	
	//stops.push(makeCircle(path[path.length-2], path[path.length-1], function(c){}))
	route.stops = stops;
}


MM.tip = function(el, title, type, desc) {
	var $el = $(el[0]),
		rect,
		wwidth = $(window).width(),
		wheight = $(window).height(),
		scroll = $(document).scrollTop(),
		popWidth = 300,
		left, top;
		
	if(!$el.length) return;
	
	//-- set content
	MM.$tipTxt.html("<h3>"+title+"</h3>"+"<p>"+desc+"<p>");
	//-- locations of station
	rect = $el.offset();
	
	left = rect.left;
	top = rect.top - scroll;
	
	
	if(rect.left > wwidth - popWidth ){
		MM.$tip.addClass("left");
		left = left - MM.$tip.width();
	}else{
		MM.$tip.removeClass("left");
	} 
	
	if(rect.top > wheight - MM.$tip.height() ){
		MM.$tip.addClass("above");
		top = top - MM.$tip.height();
	}else{
		MM.$tip.removeClass("above");
	}
	

	//-- position the popup
	MM.$tip.css("left", left );
	MM.$tip.css("top", top + "px" );
	
	MM.$tip.show();
	
	
	//console.log(rect.left, rect.top)
}

MM.bg = function(url) {
	
	if(!MM.$bg) {
		MM.$bg = $("#bg");
	}
	
	MM.$bg.fadeOut(100, function(){
		
		MM.$bg.css("background-image", "url("+url+")");	
		MM.$bg.fadeIn(500);
		
	});	
	
}

MM.end = function(el, name, overview, next, links, stat1, stat2, image) {
	var $el = $(el[0]),
		rect,
		wwidth = $(window).width(),
		scroll = $(document).scrollTop(),
		$name = MM.$end.find("#end-name"),
		$overview = MM.$end.find("#end-overview"),
		$next = MM.$end.find("#end-next"),
		$links = MM.$end.find("#end-links"),
		$stat1 = MM.$end.find("#end-stat1"),
		$stat2 = MM.$end.find("#end-stat2"),
		$image = MM.$end.find("#end-image"),
		names = name.split(' '),
		left, 
		top,
		right;
		
	if(!$el.length) return;
	
	MM.$tip.hide();
	
	//-- update content
	var endClass = "end-" + names[0].toLowerCase() + "-" + names[1].toLowerCase();
	$image.parent().removeClass().addClass(endClass);
	$name.html("<span class='first'>"+names[0]+"</span><span class='second'>"+names[1]+"</span>");
	$overview.html(overview);
	$next.html(next);
	
	$links.empty();
	links.forEach(function(link){
		$links.append("<a href = '"+link+"'>"+link+"</a>");
	});
	
	$stat1.empty();
	$stat1.append("<h2>"+stat1[1]+"</h2>");
	$stat1.append("<h3>"+stat1[0]+"</h3>");
	
	$stat2.empty();
	$stat2.append("<h2>"+stat2[1]+"</h2>");
	$stat2.append("<h3>"+stat2[0]+"</h3>");
	
	if (image) {
		$image.attr("src", image);
	}
	
	//-- locations of station
	rect = $el.offset();
	
	left = rect.left;
	top = rect.top - scroll;
	right = wwidth - (wwidth - left + 30);
	
	$("#end-arrow").css({"left": right, "top": top}).fadeIn();
	MM.$end.css("width", right)
	MM.$end.fadeIn();
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
		

		path_sequence.push( points[i].x, points[i].y );

			
	}
	
	
	
	
	return path_sequence;
}

MM.travelLines = {};

MM.travel = function(line, startat) {
	var route =  MM.fleet[line],
		config = { stroke: 'white', fill: 'none', 'fill-opacity': 0, 'stroke-width': 3},
		plen = route.events.length - 1,
		cur = startat || 0,
		delay = 4500,
		st;
		
	if(!MM.travelLines[line]){
		st = MM.travelLines[line] = MM.r.set();
	}else{
		st = MM.travelLines[line];
	}
	
	MM.pause(MM.traveling);
	
	MM.traveling = line;
	
	var show_stop = function() {
	
		MM.showStation(line, cur);
		
		if(cur > plen ) return; //-- should never get here
		
		if(cur == plen ) {
			MM.showStation(line, cur);
			return;
		}
		
		var p = MM.drawpath( MM.r, route.events[cur+1].slice, delay, config, function(){
				var l = line;
				if(MM.traveling == l){
					show_stop();
				}
			
		});
		
		st.push(p);
		
		cur++
		MM.paused[line] = cur;
		
	}
	
	show_stop(0);
	
	
	//var dpath = MM.drawpath( MM.r, MM.fleet[line].path, MM.width * 100, { stroke: 'white', fill: 'none', 'fill-opacity': 0, 'stroke-width': 4});
}


MM.pause = function(line) {
	var $el;
	
	if(MM.traveling) {
		$el = $("#toggle-"+(MM.traveling.replace(" ", "_"))).find(".travel");
		$el.removeClass("pause");
		$el.addClass("play");		
	}

	MM.traveling = false;
	clearInterval(MM.interval_id);
	
	MM.$tip.hide();
}

MM.resume = function(line) {
		var pausedat = MM.paused[line];
		var config = { stroke: 'white', fill: 'none', 'fill-opacity': 0, 'stroke-width': 3};
		
		if(MM.traveling) MM.pause(MM.traveling);
		
		var p = MM.drawpath( MM.r, MM.fleet[line].events[pausedat].slice, 150, config, function(){
				MM.travel(line, MM.paused[line]);
		});
		
		if(MM.travelLines[line]) {
			MM.travelLines[line].push(p);	
		}
		
}

MM.stop = function(line) {
	MM.traveling = false;
	clearInterval(MM.interval_id);
	MM.paused[line] = 0;
	
	MM.$tip.hide();
	
	MM.travelLines[line].remove();
	MM.travelLines[line] = false;
	
}

MM.showStation = function(v, station) {
	var e = MM.fleet[v].events[station],
		s = MM.fleet[v].stops[station];
	
	if(!e.end) {
					
		MM.tip(s[0], [e.m, e.d+",", e.y].join(" "), e.v, e.desc);
		
		MM.bg(e.img);
		$("#source").attr("href", e.source);
					
	}else{
			
		MM.end(s[0], e.name, e.overview, e.next, e.links, e.stat1, e.stat2, e.img);
					
	}
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
	
	//console.log(pathstr, guide_path)
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
		
		path.node.setAttribute('class',  'nopointer')
		
		if ( elapsed_time >= duration )
		{
			clearInterval( interval_id );
			if ( callback != undefined ) callback();
			guide_path.remove();
		}                                       
	}, interval_length );  
	
	MM.interval_id = interval_id;
	
	return result;
}

MM.start = function() {
	var $s = $("#start"),
		$intro = $("#intro"),
		$title = $("#titlecard"),
		$shape = $("#bgshape"),
		$menu = $("#menu"),
		$timeline = $("#timeline-holder"),
		$follower = $("#follower"),
		$bg = $("html"),
		$holder = $("#holder"),
		$source = $("#source"),
		$document = $(document),
		hleft = $holder.offset().left + 24,
		hright = hleft + $holder.width() - 24;
		
		MM.bg("/photos/misc/intro.jpg");
		
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
			
			//$bg.css("background-color", "#eee");
			
			setTimeout(function(){
				var f = $menu.find("li")[0];
				//$(f).trigger("click");
				$(f).find(".toggle").trigger("click");
				
				MM.travel_line = MM.travel("Cable Car");
				
				$source.fadeIn();
				
				$follower.show();
				$document.on("mousemove", function(e) {
					var left = e.clientX;
					//console.log(hleft, hright)
					if(left > hleft-4 && left < hright) {
						$follower.css("left", left);
					}
					
				});
				
			}, 2500);		
			
			
			e.preventDefault();
		})
		
		
		
		setTimeout(function(){
			$(document).on("keyup", function(e) {
				if(e.which == 13) {
					$s.trigger("click");
				}
			});
		}, 1000); //-- wait for page to load to prevent accidental trigger
		
		
		//-- events
		
		MM.$tip.find("#tip-close").on("click", function(){
			MM.$tip.fadeOut(100);
		});
		
		MM.$end.find("#end-close").on("click", function(){
			MM.$end.fadeOut(100);
			$("#end-arrow").fadeOut(100);
		});
		
		$(document).on("keyup", function(e) {
		    if(e.which == 27) {
		    	$("#tip-close").trigger("click");
		    	$("#end-close").trigger("click");
		    }
		});
		
}

MM.menu = function($el) {
	for (var v in MM.fleet) {
		var id = v.replace(' ', '_'),
			$b = $("<li id='toggle-"+id+"' style='background-color: "+MM.fleet[v].color+"' data-v='"+v+"' class='off'><a href='#"+id+"'  class='toggle' >"+v+"</a><a href='#"+id+"' class='travel play'></a></li>"),
			$tog = $b.find(".toggle"),
			$play = $b.find(".travel");
			
		if(!MM.fleet[v].events.length) return;
		
		if(v == "Cable Car") {
			$play.removeClass("play");
			$play.addClass("pause");
		}
		
		$tog.on("click", function(e){
			var $this = $(this),
				$p = $this.parent(),
				$pb = $p.find(".travel"),
				name = $p.data("v");

			MM.toggleRoute(name);
			
			
			if($p.hasClass("off")) {
				$p.removeClass("off");
												
			}else{
				$p.addClass("off");
				
				$pb.removeClass("pause");
				$pb.addClass("play");
				
			}
			
			e.preventDefault();
		});
		
		$play.on("click", function(e) {
			var $this = $(this),
				$p = $this.parent(),
				name = $p.data("v");
			
			if($p.hasClass("off")) {
				
				MM.toggleRoute(name);
				
				MM.travel(name);
				$p.removeClass("off");
				
				//$(".pause").removeClass("pause").addClass("play");
				
				$this.removeClass("play");
				$this.addClass("pause");

			} else if($this.hasClass("pause")){
				MM.pause(name);
				
				$this.removeClass("pause");
				$this.addClass("play");
				
			} else if($this.hasClass("play")){
				
				MM.resume(name);
				
				//$(".pause").removeClass("pause").addClass("play");
				
				$this.removeClass("play");
				$this.addClass("pause");
				
			}
			
			e.preventDefault();
			
		});
		
		$el.append($b);
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

