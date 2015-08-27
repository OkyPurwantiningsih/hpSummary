
// =================================== Start Variable Declaration ======================================
// Define Canvas for Slider
var sliderMargin = {top: 200, right: 6, bottom: 200, left: 6},
	sliderWidth = 290 - sliderMargin.left - sliderMargin.right,
	sliderHeight = 400 - sliderMargin.bottom - sliderMargin.top;
var xS, brush, svgS, slider, handle, sliderVal, eventNo, thresholdVal, xSCluster;
var brush2, handle2;
var brush3, handle3;
var sliderXRangeClicked = true, sliderEventClicked = false, sliderClusterClicked = false;
var blueColor = "rgb(44,147,255)", greyColor = "rgb(221,221,221)";

// Define y axis variable
var listOfSession, tr_y, y, yAxis, sectionLine, axis, gridyAxis; 

// Define x axis variable
var x,x2, trmaxX, tr_x, xAxis;

var posChecked = true, netChecked = true, negChecked = true;
var checkedEvent = 3;

// Define Canvas and Chart variables
var trColor = ["rgb(251,128,144)", "rgb(255,255,179)", "rgb(141,211,199)", "rgb(255,255,255)"],
	eventType = ["Negative","Neutral","Positive"];
var offsetType = "silhouette",//"wiggle",
    interpolationType = "cardinal";
var containerWidth=1200,
	containerHeight=550,
	margin = {top: 50, right: 30, bottom: 70, left: 90},
	width = containerWidth - margin.left - margin.right,
	height = containerHeight - margin.top - margin.bottom;
var stack, area;
//var sessions = "1,2,3,4,5,6,7,8,9,10,11,12,13,14";
var sessions = "1,2";
var sessionArr = sessions.split(",");
var svg;

var drag, crossedLeftLine = [], crossedRightLine = [], upperBound, lowerBound, 
	chartToUpdate = [], changedSections = [], changedLine = [];
var sections = [], distances = [], max, sectionName;
var minX, maxX, sectionSizePx, n;
var threshold = 0.2; // if distance is below threshold, then merge
var alpha = 0.5;

// =================================== Start Application Code ======================================
$(document).ready(function (){
	load();
})

function load(){
	
	//d3.json("data/summaryAllSessionCedric.json", function(error, dataAll) {
	d3.json("data/test.json", function(error, dataAll) {
		if(error){
			console.log(error);
			alert("Data can't be loaded");
		}else{
			
			dataAll.forEach( function(d){
				d.x = +d.x;
			});
			
			// Only include selected session
			data = filterSessions(dataAll);
			
			// Define general properties of the chart
			defineStackFunction();
			defineAreaFunction();
			defineDragFunction();
			listOfSession = d3.set(data.map(function(d){return d.sessionName;}))
							  .values()
							  .sort(sortStringAsc);
			
			// ====== 1. Divide the area into n different section
			minX = d3.min(data, function(d) {return parseInt(d.x);}); // parseInt() round float to the smaller int
			maxX = d3.max(data, function(d) {return parseInt(d.x);});

			n = ((maxX+1)-(minX-1)); // number of section if the chart is divided into the smallest x-unit

			// Draw Slider. Set max slider value = number of sections (n)
			drawSlider();
			drawSlider_Event();
			drawSlider_Cluster();
			
			// What to do when checkbox is clicked
			$('.checkbox').click(function() {
				if($(this).hasClass('checked')){
					if($(this).hasClass('ct-green')){ posChecked = false;}
					if($(this).hasClass('ct-orange')){ netChecked = false;}
					if($(this).hasClass('ct-red')){ negChecked = false;}
					checkedEvent--;
				}else{
					if($(this).hasClass('ct-green')){ posChecked = true;}
					if($(this).hasClass('ct-orange')){ netChecked = true;}
					if($(this).hasClass('ct-red')){ negChecked = true;}
					checkedEvent++;
				}

				// update chart
				if(!(d3.select("#chartContainer").select("svg")[0][0] === null)){
					redrawChart();
				}
			});
						
			// What to do when slider radio button is clicked
			$('.radio').click(function() {
				clickedRadio = $(this).find("input")[0].id;
				if(clickedRadio=="radioXRange"){
					if(!($(this).hasClass('checked'))){
						d3.select('#circleXRange').style("fill", blueColor)
												 .style("pointer-events", "visible");
						d3.select('#circleEvent').style("fill", greyColor)
												.style("pointer-events", "none")
												.transition()
												.duration(1000)
												.attr("cx", 0);
						d3.select('#circleCluster').style("fill", greyColor)
												.style("pointer-events", "none")
												.transition()
												.duration(1000)
												.attr("cx", 0);
						sliderXRangeClicked = true;
						sliderEventClicked = false;
						sliderClusterClicked = false;
					}
				}
				if(clickedRadio=="radioEvent"){
					if(!($(this).hasClass('checked'))){
						d3.select('#circleXRange').style("fill", greyColor)
												.style("pointer-events", "none")
												.transition()
												.duration(1000)
												.attr("cx", 0);
						d3.select('#circleEvent').style("fill", blueColor).style("pointer-events", "visible");
						d3.select('#circleCluster').style("fill", greyColor)
												.style("pointer-events", "none")
												.transition()
												.duration(1000)
												.attr("cx", 0);
						
						sliderXRangeClicked = false;
						sliderEventClicked = true;
						sliderClusterClicked = false;
					}
				}
				if(clickedRadio=="radioCluster"){
					if(!($(this).hasClass('checked'))){
						d3.select('#circleXRange').style("fill", greyColor)
												.style("pointer-events", "none")
												.transition()
												.duration(1000)
												.attr("cx", 0);
						d3.select('#circleEvent').style("fill", greyColor)
												.style("pointer-events", "none")
												.transition()
												.duration(1000)
												.attr("cx", 0);
						d3.select('#circleCluster').style("fill", blueColor).style("pointer-events", "visible");
						sliderXRangeClicked = false;
						sliderEventClicked = false;
						sliderClusterClicked = true;
					}
				}
			});
		}
	})
}

function redrawChart(){
	if(sliderVal>0){
		console.log(sectionLineList);
		// recalculate the data
		sections.length = 0;
		//sectionSizePx = width/sliderVal;
		//xRange = n/sliderVal;

		// ====== 2. Define the profile of each section
		var neg, net, pos;
		sectionName = 1;
		var i=(minX-1), nexti;

		for(var j=0; j<sectionLineList.length; j++){
			
			nexti = sectionLineList[j].x;
			
			dataPerSection = data.filter(function(d){ return ((d.x > i) && (d.x <= nexti))});
			processSectionData(dataPerSection);
			//processSectionData(i,nexti);
		
			line = new Line({x:nexti, text:round(nexti,2), linePos: sectionName});
			sections.push(new Section(
			{	sectionName: sectionName,
				lowerBound: i,
				upperBound: nexti,
				sectionLine: line,
				slices: slices,
				normalizedSlices: normalizedSlices,
				normalizedSlicesByCol: normalizedSlicesByCol,
				stackData: stackData,
				max: max
			}));
			
			sectionName++;
			i = nexti;
		}
		
		
		/*if(sliderClusterClicked){
			calculateDistance(sections);
			cluster();
		}*/
		
		// Visualize
		redrawThemeRiverGraph(sections);
	}
	
}

function drawChart(){
	if(sliderVal>0){
		
		sections.length = 0;
		// ====== 2. Define the profile of each section
		if(sliderEventClicked){

			//sections = processSectionDataByNumber(eventNo);
			sections = processSectionDataByNumber2(eventNo);

			// Visualize
			draw();
		}else{
			sectionSizePx = width/sliderVal;
			xRange = n/sliderVal;

			var neg, net, pos;
			sectionName = 1;
			var i=(minX-1), nexti;
			//while(i<(maxX+1)){
			for(var j=0; j<sliderVal; j++){
				nexti = i + xRange;
				if(j==sliderVal-1){nexti=maxX+1;} // For the right most section, set upperbound to maxX+1
				
				dataPerSection = data.filter(function(d){ return ((d.x > i) && (d.x <= nexti))});
				processSectionData(dataPerSection);
				//processSectionData(i,nexti);
			
				line = new Line({x:nexti, text:round(nexti,2), linePos: sectionName});
				sections.push(new Section(
				{	sectionName: sectionName,
					lowerBound: i,
					upperBound: nexti,
					sectionLine: line,
					slices: slices,
					normalizedSlices: normalizedSlices,
					normalizedSlicesByCol: normalizedSlicesByCol,
					stackData: stackData,
					max: max
				}));
				
				sectionName++;
				i = nexti;
			}
			console.log(sections);
			// ====== 4. calculate distance between consecutive slices
			calculateDistance(sections);
			
			// ====== 5. Hierarchical Clustering
			if(sliderClusterClicked)
				cluster();
			console.log(sections);
			// Visualize
			draw();
		}
		
		
	}
}

function sortStringAsc(a,b){
	if (parseInt(a)<parseInt(b))
		return -1;
	if (parseInt(a)>parseInt(b))
		return 1;
		
	return 0;
}

function sortIntegerAsc(a,b){
	if (parseInt(a.x)<parseInt(b.x))
		return -1;
	if (parseInt(a.x)>parseInt(b.x))
		return 1;
		
	return 0;
}

function sortFloatAsc(a,b){
	if (parseFloat(a.x)<parseFloat(b.x))
		return -1;
	if (parseFloat(a.x)>parseFloat(b.x))
		return 1;
		
	return 0;
}

function initYAxis(){

	// Define scale
	tr_y = d3.scale.linear().range([height, 0]);
	tr_y.domain([d3.max(listOfSession), 1]);
	
	y = d3.scale.ordinal()
		.domain(listOfSession)
		.rangePoints([height, 0],0);
	
	yAxis = d3.svg.axis()
				.scale(y)
				.tickFormat(function(d) { return "Session " + d;})
				.orient("left");
				
	gridyAxis = d3.svg.axis()
					.scale(y)
					.ticks(5)
					.tickSize(width, 0)
					.tickFormat("")
					.orient("right");
	
	sectionLine = d3.scale.linear()
					.range([height,0])
					.domain(listOfSession);
					
	axis = d3.svg.axis()
				.scale(sectionLine)
				.tickFormat("")
				.orient("left")
				.ticks(0);
}

function initXAxis(){
	
	x = d3.scale.linear().range([0, width]).domain([minX-1, maxX+1]);
	x2 = d3.scale.linear().range([minX-1,maxX+1]).domain([0,width]);

	trmaxX = getMaxYAllSection();
	
	if(sliderEventClicked){
		tr_x = d3.scale.linear()
				.range([0, getMinSectionSize(sections)])
				.domain([0, trmaxX]);
	}else{
		tr_x = d3.scale.linear()
				.range([0, sectionSizePx])
				.domain([0, trmaxX]);
	}
	
	
	xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(0);

}

function getMaxYAllSection(){
	// Calculate max y value for all area
	var maxYValue = 0;
	for(var j = 0; j < sections.length; j++){
		for(var i = 0; i < sections[j].stackData.length; i++){
			if( maxYValue < d3.max(sections[j].stackData[i].dataArr, function(d) { return d.y + d.y0; })){
				maxYValue = d3.max(sections[j].stackData[i].dataArr, function(d) { return d.y + d.y0; });
			}
		}
	}
	
	return maxYValue;
}

function drawAxis(){

	// draw line for slider
	svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + (height+30) + ")")
	.call(xAxis);
	
	// draw y axis
	svg.append("g")
	.attr("class", "y axis")
	.call(yAxis)
	.append("svg:text")
		  .attr("text-anchor", "middle")
		  .attr("y", -9)
		  .text(minX-1);
		  
	// draw y axis grid
	svg.append("g")
		.classed('y', true)
		.classed('grid', true)
		.call(gridyAxis);
	
	// draw x axis
	svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis);
	
	// draw top x axis
	svg.append("g")
	.attr("class", "x axis top")
	.call(xAxis);
}

function appendCanvas(){
	// Remove existing canvas if exists
	d3.select("#chartContainer").select("svg").remove();
	
	// Append canvas
	svg = d3.select("#chartContainer").append("svg")
				//.attr("id","trSvg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.on("click", mouseclick)
				.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
				
					
}

function mouseclick(d, i) {
	mousex = d3.mouse(this)[0];
	mousey = d3.mouse(this)[1];
	if((mousex>margin.left)&&(mousex<(containerWidth-margin.right))&&(mousey<margin.top)&&(mousey>(margin.top-30)))
		//console.log(d3.mouse(this));
		splitSection(x2(mousex-90));
}

function splitSection(input){
	console.log(input);
	
	borderLine = [];
	// Get lowerbound and upperbound
	for(var i=0; i<sections.length; i++){
		if((input>sections[i].lowerBound) && (input<=sections[i].upperBound)){
			borderLine.push(sections[i].lowerBound);
			borderLine.push(input);
			borderLine.push(sections[i].upperBound);
			sectionName = sections[i].sectionName;
			break;
		}
	}
	
	// Recalculate Data
	newSections = [];
	newSections = recalculateSections(borderLine, sectionName);
	// console.log(newSections);
	
	// Update section class and chart class
	// Check if the section and chart is the last one. If not, update the class
	if(!(sectionName==sections[sections.length-1].sectionName)){
		
		for(var j=sections.length; j>=(sectionName+1); j--){
			nextj=j+1;
			console.log("change section "+j+" to section "+nextj);
			d3.selectAll(".section"+j)
						.attr("class", "section"+ nextj);

			d3.selectAll(".chart"+j)
				.attr("class", "chart"+nextj);
				
			sections[j-1].sectionName = nextj;
			sections[j-1].sectionLine.linePos = nextj;
		}
	}
	
	d3.selectAll(".section"+sectionName)
		.attr("class", "section"+ (sectionName+1));
	
	removed = sections.splice(sectionName-1,1,newSections[0],newSections[1]);
	
	// Split the chart
	var j=sectionName;
	for(var i=0; i<newSections.length; i++){		
		
		maxYAfterStacked = getMaxYOfSection(newSections[i].stackData);
		sectionSize = x(newSections[i].upperBound) - x(newSections[i].lowerBound);
		
		// if it's the first, update chart, else create new chart
		if(i==0){
			svg.selectAll('.chart'+j)
				  .selectAll("path")
				  .data(newSections[i].stackData)
				  //.transition()
				  //.duration(2500)
				  .attr("d", function(d) { return area(d.dataArr); })
				  .style("fill", function(d) { return d.color; });
			
			svg.selectAll('.chart'+j)
			//.transition()
		    //.duration(2500)
			.attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(newSections[i].lowerBound)) + "," + 0 + ")"; });
			
		}else{

			container = svg.append("g")
					   .attr('class','chart'+j)
					   .attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(newSections[i].lowerBound)) + "," + 0 + ")"; });
						
			container.selectAll("path")
				.data(newSections[i].stackData)
				.enter().append("path")
				.attr("d", function(d) { return area(d.dataArr); })
				.style("fill", function(d) { return d.color; })
				.append("title")
				.text(function(d) { return d.type; });
		}
		
		
		
		/*svg.selectAll('.chart'+j)
			.attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(newSections[i].lowerBound)) + "," + 0 + ")"; });*/
		
		j++;
	
	}	
	console.log(sections);
	// Draw line
	sectionLineList.length = 0;
	sectionLineList = sections.map(function (d) { return d.sectionLine; });
	drawSectionLine(sectionLineList);
	
	// Redraw top x axis
	d3.selectAll(".top").remove();
	
	svg.append("g")
		.attr("class", "x axis top")
		.call(xAxis);
}

function drawThemeRiverGraph(input){

	for(var i = 0; i < input.length; i++){
		container = svg.append("g")
					   .attr('class','chart'+input[i].sectionName);
		//console.log(input[i].stackData);
		container.selectAll("path")
			.data(input[i].stackData)
			.enter().append("path")
			.attr("d", function(d) { return area(d.dataArr); })
			.style("fill", function(d) { return d.color; })
			.append("title")
			.text(function(d) { return d.type; });
		
		maxYAfterStacked = getMaxYOfSection(input[i].stackData);
		sectionSize = x(input[i].upperBound) - x(input[i].lowerBound);
		
		svg.selectAll('.chart'+input[i].sectionName)
			.attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(input[i].lowerBound)) + "," + 0 + ")"; });

	}
}

function redrawThemeRiverGraph(input){

	for(var i = 0; i < input.length; i++){
		
		maxYAfterStacked = getMaxYOfSection(input[i].stackData);
		sectionSize = x(input[i].upperBound) - x(input[i].lowerBound);
			  
		tr = svg.selectAll('.chart'+input[i].sectionName);
		
	    tr.selectAll("path")
		  .data(input[i].stackData)
		  .transition()
		  .duration(2500)
		  .attr("d", function(d) { return area(d.dataArr); })
		  .style("fill", function(d) { return d.color; });
		  //.append("title")
		  //.text(function(d) { return d.type; });

		svg.selectAll('.chart'+input[i].sectionName)
		   .transition()
		   .duration(2500)
		   .attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(input[i].lowerBound)) + "," + 0 + ")"; });
	
	}
}

// return the maximum x for a certain section
function getMaxYOfSection(inputArray){
	var maxYValue = 0;

	for(var i = 0; i < inputArray.length; i++){
		if( maxYValue < d3.max(inputArray[i].dataArr, function(d) { return d.y + d.y0; })){
			maxYValue = d3.max(inputArray[i].dataArr, function(d) { return d.y + d.y0; });
		}
	}

	return maxYValue;
}

function drawSectionLine(input){
	// Remove existing line
	for(var i=0; i<input.length;i++){
		svg.selectAll(".section"+input[i].linePos).remove();
	}
	
	// Add a group element for each section.
	g = svg.selectAll(".section")
		  .data(input.filter(function(d){ return !(d.x===(maxX+1))}))
		.enter().append("svg:g")
		  .attr("class", function(d) { return "section"+ d.linePos; })
		  .attr("transform", function(d) { return "translate(" + x(d.x) + ")"; })
		  .call(drag);
	
	// Add section line and title.
	g.append("svg:g")
		  .attr("class", "axis")
		  .each(function(d) { d3.select(this).call(axis) })
		.append("svg:text")
		  .attr("text-anchor", "middle")
		  .attr("y", -9)
		  .text(function(d) {return d.text;});

	// Add triangle symbol	
	g.append("path")
		.attr("class", "triangle")
        .attr("d", d3.svg.symbol().type("triangle-up").size(100))
        .attr("transform", function(d) { return "translate(" + 0 + "," + (height+30) + ")"; });
		
	// Add the most right line
	svg.append("svg:g")
		  .attr("class", "section"+input[input.length-1].linePos)
		  .attr("transform", "translate(" + x(input[input.length-1].x) + ")")
		.append("svg:g")
		  .attr("class", "axis")
		  .call(axis)
		.append("svg:text")
		  .attr("text-anchor", "middle")
		  .attr("y", -9)
		  .text(input[input.length-1].text);
}

function draw(){
	initYAxis();
	initXAxis();
	appendCanvas();

	// draw graph
	drawThemeRiverGraph(sections);
	
	// draw axis
	drawAxis();
	
	// draw line
	sectionLineList = sections.map(function (d) { return d.sectionLine; });
	drawSectionLine(sectionLineList);
	
	
}

function cluster(){
	
	merging = true;
	updatedSection = [];
	while(merging){
		
		// check if there is distance which fall below the threshold
		// if the distance is below the threshold, merge the section
		count = 0;
		for(var i=0; i<distances.length; i++){
			if(distances[i]<thresholdVal){
				//console.log("merge section "+ (i+1) +" and "+ (i+2));
				
				dataPerSection = data.filter(function(d){ return ((d.x > sections[i].lowerBound) && (d.x <= sections[i+1].upperBound))});
				processSectionData(dataPerSection);
				//processSectionData(sections[i].lowerBound,sections[i+1].upperBound);
				line = new Line({x:sections[i+1].upperBound, text:round(sections[i+1].upperBound,2), linePos: i+1});
				sectionName = i+1;
				
				// get the left side of the merged sections
				updatedSection = sections.slice(0,i);
				
				// add the merged section
				updatedSection.push(new Section(
				{	sectionName: sectionName,
					lowerBound: sections[i].lowerBound,
					upperBound: sections[i+1].upperBound,
					sectionLine: line,
					slices: slices,
					normalizedSlices: normalizedSlices,
					normalizedSlicesByCol: normalizedSlicesByCol,
					stackData: stackData,
					max: max
				}));
				
				// add the right side of the merged sections if it is not the most right
				if((i+1) < (sections.length-1)){
					sections.slice(i+2).forEach(function(d){
						updatedSection.push(d);
					});
				}
							
				// update the data of the right side merged sections
				for(var j=(i+1); j<updatedSection.length; j++){
					sectionName++;
					updatedSection[j].sectionName = sectionName;
					line = new Line({x:updatedSection[j].upperBound, text:round(updatedSection[j].upperBound,2), linePos: sectionName});
					updatedSection[j].sectionLine = line;
				}
				
				// update distance array
				distances.splice(i,1);
				
				sections = updatedSection;
				//console.log(sections.length);
				--i;
				count++;
			}
		}
		
		// if all of the distance is over the threshold, exit from the loop
		if(count===0){
			break;
		}
		// recalculate distances
		calculateDistance(sections);

	}
}
function calculateDistance(input){
	distances.length = 0;
	noOfSession = listOfSession.length;
	maxDistance = Math.sqrt(checkedEvent);
	
	for(var i=0; i<input.length-1; i++){
		
		
		d = 0, d1 = 0, d2 = 0, d2Neg = 0, d2Net = 0, d2Pos = 0;
		sumNeg = 0, sumNet = 0, sumPos = 0;
		maxs1Neg = d3.max(input[i].slices, function(d){return d.neg;});
		maxs1Net = d3.max(input[i].slices, function(d){return d.net;});
		maxs1Pos = d3.max(input[i].slices, function(d){return d.pos;});
		maxs2Neg = d3.max(input[i+1].slices, function(d){return d.neg;});
		maxs2Net = d3.max(input[i+1].slices, function(d){return d.net;});
		maxs2Pos = d3.max(input[i+1].slices, function(d){return d.pos;});
		
		if(maxs1Neg==0 && maxs1Net==0 && maxs1Pos==0){
			s1_allzero = true;
		}else{
			s1_allzero = false;
		}
		
		if(maxs2Neg==0 && maxs2Net==0 && maxs2Pos==0){
			s2_allzero = true;
		}else{
			s2_allzero = false;
		}
				
		for(var j=0; j<input[i].normalizedSlices.length; j++){
			
			s1 = input[i].normalizedSlices[j];
			ss1 = input[i].normalizedSlicesByCol[j];
			s2 = input[i+1].normalizedSlices[j];
			ss2 = input[i+1].normalizedSlicesByCol[j];
			
			// 1. Calculate the first distance: the difference of proportion for each session between consecutive sections
			d1 = d1 + (Math.sqrt(Math.pow((s2.neg-s1.neg),2)+Math.pow((s2.net-s1.net),2)+Math.pow((s2.pos-s1.pos),2))/maxDistance);
			console.log("d1-session"+(j+1)+":"+d1);
			// 2. Calculate the second distance: the difference in number of events evolution between consecutive sections
			// ==== check if the denominator is zero

			sumNeg = sumNeg + Math.pow((ss1.neg - ss2.neg),2);
			sumNet = sumNet + Math.pow((ss1.net - ss2.net),2);
			sumPos = sumPos + Math.pow((ss1.pos - ss2.pos),2);
		}
		d1 = d1/noOfSession;
		
		// if one of the section is all zero and the other is at least has one that is not zero, then the distance is 1
		if((s1_allzero && !s2_allzero)||(!s1_allzero && s2_allzero)){
			d2 = 1;
		
		// if both sections is all zero or both has any values other than zero
		}else{
			d2Neg = Math.sqrt(sumNeg)/Math.sqrt(noOfSession);
			d2Net = Math.sqrt(sumNet)/Math.sqrt(noOfSession);
			d2Pos = Math.sqrt(sumPos)/Math.sqrt(noOfSession);
			d2 = (d2Neg+d2Net+d2Pos)/3;
		}
		
		
		// 3. Combine both distance
		console.log("d1:"+d1);
		console.log("d2:"+d2);
		d = (alpha*d1)+((1-alpha)*d2);
		distances.push(d);
	}
	
	console.log(distances);
}

// this function considers all event type
function processSectionDataByNumber(inputNo){
	
	// Order the data by the value of x, ascending
	data.sort(sortFloatAsc);
	
	var i = 0, output = [];
	sectionName = 1;
	lastSection = false;
	while(i<data.length){
		
		dataPersection = [];
		// For every eventSliderVal value, group the data by event type
		endSlice = i + inputNo;
		eventLeft = data.length - endSlice;
		if(eventLeft < 10){
			dataPerSection = data.slice(i);
			endSlice = data.length;
		}else{
			dataPerSection = data.slice(i, endSlice);
		}
		
		if(endSlice == data.length)
			lastSection = true;
		
		processSectionData(dataPerSection);

		// For the first section, set lowerBound as minX-1
		if(sectionName==1)
			lowerBound = minX-1;
		else
			lowerBound = upperBound; // set the lowerBound equals to the previous section upperBound

		// For the last section, set upperBound as maxX+1
		if(lastSection)
			upperBound = maxX+1;
		else
			upperBound = d3.max(dataPerSection, function(d) {return parseFloat(d.x);});
		console.log(upperBound);
		line = new Line({x:upperBound, text:round(upperBound,2), linePos: sectionName});
		output.push(new Section(
		{	sectionName: sectionName,
			lowerBound: lowerBound,
			upperBound: upperBound,
			sectionLine: line,
			slices: slices,
			normalizedSlices: normalizedSlices,
			normalizedSlicesByCol: normalizedSlicesByCol,
			stackData: stackData,
			max: max
		}));
		
		sectionName++;
		i=endSlice;
	}
	console.log(output);
	return output;
	
	
}

// this function only considers positive and negative events
function processSectionDataByNumber2(inputNo){
	
	dataPosNeg = []; 
	// Order the data by the value of x, ascending
	data.sort(sortFloatAsc);
	dataPosNeg = data.filter(isPositiveOrNegative).sort(sortFloatAsc);

	var i = 0, output = [];
	sectionName = 1;
	lowerBound = minX-1;
	lastSection = false;
	//console.log("===============");
	while(i<dataPosNeg.length){
		
		dataPersection = [];
		dataPosNegPerSection = [];
		// For every eventSliderVal value, group the data by event type
		endSlice = i + inputNo;
		eventLeft = dataPosNeg.length - endSlice;

		if(eventLeft < 10){
			upperBound = maxX+1;
			endSlice = data.length;
		}else{
			dataPosNegPerSection = dataPosNeg.slice(i, endSlice);
			upperBound = dataPosNegPerSection[dataPosNegPerSection.length-1].x;
		}

		dataPerSection = data.filter(function(d){ return ((d.x > lowerBound) && (d.x <= upperBound))});

		if(endSlice == data.length)
			lastSection = true;
		
		processSectionData(dataPerSection);

		// For the first section, set lowerBound as minX-1
		/*if(sectionName==1)
			lowerBound = minX-1;
		else
			lowerBound = upperBound; // set the lowerBound equals to the previous section upperBound

		// For the last section, set upperBound as maxX+1
		if(lastSection)
			upperBound = maxX+1;
		else
			upperBound = d3.max(dataPerSection, function(d) {return parseFloat(d.x);});*/
		
		line = new Line({x:upperBound, text:round(upperBound,2), linePos: sectionName});
		output.push(new Section(
		{	sectionName: sectionName,
			lowerBound: lowerBound,
			upperBound: upperBound,
			sectionLine: line,
			slices: slices,
			normalizedSlices: normalizedSlices,
			normalizedSlicesByCol: normalizedSlicesByCol,
			stackData: stackData,
			max: max
		}));
		
		lowerBound = upperBound;
		sectionName++;
		i=endSlice;
	}
	//console.log(output);
	return output;
	
	
}

//function processSectionData(inputLeft,inputRight){
function processSectionData(input){
	//dataPerSection = data.filter(function(d){ return ((d.x > inputLeft) && (d.x <= inputRight))});
		
	slices = [];
	listPos = [], listNet = [], listNeg = [], dataCombined = [], stackData = [];
	slices.length = 0;
	max = 0;
	for(var j=0; j<listOfSession.length; j++){
		//dataPerSession = dataPerSection.filter(function(d) { return d.sessionName == listOfSession[j];});
		dataPerSession = input.filter(function(d) { return d.sessionName == listOfSession[j];});
		if(negChecked)
			neg = dataPerSession.filter(isNegative).length;
		else
			neg = 0;
		
		if(netChecked)
			net = dataPerSession.filter(isNeutral).length;
		else
			net = 0;
		
		if(posChecked)
			pos = dataPerSession.filter(isPositive).length;
		else
			pos = 0;
		
		listPos.push(new Dt({sessionName:listOfSession[j],noOfEvent:pos,eventCat:"Positive"}));
		listNet.push(new Dt({sessionName:listOfSession[j],noOfEvent:net,eventCat:"Neutral"}));
		listNeg.push(new Dt({sessionName:listOfSession[j],noOfEvent:neg,eventCat:"Negative"}));
		
		// calculate max value for all session in the same section
		//max = d3.max([max,d3.max([pos, d3.max([neg, net])])]);
		slices.push(new Slice({	
					neg: neg,
					net: net,
					pos: pos				
				}));
		
	}
	
	// put all event category together
	//dataCombined = setDataCombined(listNeg, listNet, listPos, listNegEmpty, listNetEmpty, listPosEmpty);
	dataCombined = [{type:eventType[0], dataArr: listNeg, color:trColor[0]},
					{type:eventType[1], dataArr: listNet, color:trColor[1]},
					{type:eventType[2], dataArr: listPos, color:trColor[2]}];
	
	stackData = stack(dataCombined);
	
	// ====== 3. calculate normalized value for each slice by dividing it with max value	
	normalizedSlices = [];
	normalizedSlicesByCol = [];
	
	maxNeg = d3.max(slices, function(d){return d.neg;});
	maxNet = d3.max(slices, function(d){return d.net;});
	maxPos = d3.max(slices, function(d){return d.pos;});
	for(var j=0; j<slices.length; j++){
		// calculate max value for one session in one section
		max = 0;
		max = d3.max([max,d3.max([slices[j].pos, d3.max([slices[j].neg, slices[j].net])])]);
		if(max==0){
			normalizedSlices.push(new Slice({
				neg:0,
				net:0,
				pos:0
			}));
		}else{
			normalizedSlices.push(new Slice({
			neg:(slices[j].neg/max),
			net:(slices[j].net/max),
			pos:(slices[j].pos/max)
		}));
		}
		
		if(maxNeg==0) neg=0; else neg=(slices[j].neg/maxNeg);
		if(maxNet==0) net=0; else net=(slices[j].net/maxNet);
		if(maxPos==0) pos=0; else pos=(slices[j].pos/maxPos);
		normalizedSlicesByCol.push(new Slice({
			neg:neg,
			net:net,
			pos:pos
		}));
		
	}

}

function setDataCombined(listNeg, listNet, listPos, listNegEmpty, listNetEmpty, listPosEmpty){
	combined = [];
	if(posChecked && netChecked && negChecked){
		combined = [{type:eventType[0], dataArr: listNeg, color:trColor[0]},
					{type:eventType[1], dataArr: listNet, color:trColor[1]},
					{type:eventType[2], dataArr: listPos, color:trColor[2]}];
	}
	
	if(!posChecked && netChecked && negChecked){
		combined = [{type:eventType[0], dataArr: listNeg, color:trColor[0]},
					{type:eventType[1], dataArr: listNet, color:trColor[1]},
					{type:eventType[2], dataArr: listPosEmpty, color:trColor[2]}];
	}
	
	if(posChecked && !netChecked && negChecked){
		combined = [{type:eventType[0], dataArr: listNeg, color:trColor[0]},
					{type:eventType[1], dataArr: listNetEmpty, color:trColor[1]},
					{type:eventType[2], dataArr: listPos, color:trColor[2]}];
	}
	
	if(posChecked && netChecked && !negChecked){
		combined = [{type:eventType[0], dataArr: listNegEmpty, color:trColor[0]},
					{type:eventType[1], dataArr: listNet, color:trColor[1]},
					{type:eventType[2], dataArr: listPos, color:trColor[2]}];
	}
	
	if(!posChecked && !netChecked && negChecked){
		combined = [{type:eventType[0], dataArr: listNeg, color:trColor[0]},
					{type:eventType[1], dataArr: listNetEmpty, color:trColor[1]},
					{type:eventType[2], dataArr: listPosEmpty, color:trColor[2]}];
	}
	
	if(posChecked && !netChecked && !negChecked){
		combined = [{type:eventType[0], dataArr: listNegEmpty, color:trColor[0]},
					{type:eventType[1], dataArr: listNetEmpty, color:trColor[1]},
					{type:eventType[2], dataArr: listPos, color:trColor[2]}];
	}
	
	if(!posChecked && netChecked && !negChecked){
		combined = [{type:eventType[0], dataArr: listNegEmpty, color:trColor[0]},
					{type:eventType[1], dataArr: listNet, color:trColor[1]},
					{type:eventType[2], dataArr: listPosEmpty, color:trColor[2]}];
	}
	
	if(!posChecked && !netChecked && !negChecked){
		combined = [{type:eventType[0], dataArr: listNegEmpty, color:trColor[0]},
					{type:eventType[1], dataArr: listNetEmpty, color:trColor[1]},
					{type:eventType[2], dataArr: listPosEmpty, color:trColor[2]}];
	}
	
	
	return combined;
}

function drawSlider(){
	xS = d3.scale.linear()
		.domain([0, n])
		.range([0, sliderWidth])
		.clamp(true);
					
	brush = d3.svg.brush()
		.x(xS)
		.extent([0, 0])
		.on("brush", brushed);

	svgS = d3.select("#brushSlider").append("svg")
		.attr("width", sliderWidth + sliderMargin.left + sliderMargin.right)
		.attr("height", sliderHeight + sliderMargin.top + sliderMargin.bottom);
	  
	slider1 = svgS.append("g")
		.attr("id", "sliderXRange")
		.attr("transform", "translate(" + sliderMargin.left + "," + 20 + ")"); // set position of slider
		
	slider1.append("g")
		.attr("class", "x slideraxis")
		.call(d3.svg.axis()
		  .scale(xS)
		  .orient("bottom")
		  .tickFormat(function(d) { return d; })
		  .tickSize(0)
		  .tickPadding(12))
	  .select(".domain")
	  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("class", "halo");

	brushslider1 = slider1.append("g")
		.attr("class", "brushslider")
		.call(brush);

	brushslider1.selectAll(".extent,.resize")
		.remove();

	brushslider1.select(".background")
		.attr("height", sliderHeight);

	handle1 = brushslider1.append("circle")
		.attr("id","circleXRange")
		.attr("class", "brushhandle")
		.attr("transform", "translate(0," + sliderHeight / 2 + ")")
		.attr("r", 5);

	brushslider1
		.call(brush.event)
	  .transition() // gratuitous intro!
		.duration(750)
		.call(brush.extent([0, 0]))
		.call(brush.event);
}

function drawSlider_Event(){
	brush2 = d3.svg.brush()
		.x(xS)
		.extent([0, 0])
		.on("brush", brushed2);
		
	slider2 = svgS.append("g")
				  .attr("id", "sliderEvent")
				  .attr("transform", "translate(" + sliderMargin.left + "," + 47 + ")");
				 
	slider2.append("g")
		.attr("class", "x slideraxis")
		.attr("transform", "translate(0," + sliderHeight / 2 + ")")
		.call(d3.svg.axis()
		  .scale(xS)
		  .orient("bottom")
		  .tickFormat(function(d) { return d; })
		  .tickSize(0)
		  .tickPadding(12))
	  .select(".domain")
	  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("class", "halo");

	brushslider2 = slider2.append("g")
		.attr("class", "brushslider")
		.call(brush2);

	brushslider2.selectAll(".extent,.resize")
		.remove();

	brushslider2.select(".background")
		.attr("height", sliderHeight);

	handle2 = brushslider2.append("circle")
		.attr("id","circleEvent")
		.attr("class", "brushhandle")
		.attr("transform", "translate(0," + sliderHeight / 2 + ")")
		.style("fill", greyColor)
		.style("pointer-events", "none")
		.attr("r", 5);

	brushslider2
		.call(brush2.event)
	  .transition() // gratuitous intro!
		.duration(750)
		.call(brush2.extent([0, 0]))
		.call(brush2.event);
}

function drawSlider_Cluster(){
	xSCluster = d3.scale.linear()
		.domain([0, 1])
		.range([0, sliderWidth])
		.clamp(true);
		
	brush3 = d3.svg.brush()
		.x(xSCluster)
		.extent([0, 0])
		.on("brush", brushed3);
		
	slider3 = svgS.append("g")
				  .attr("id", "sliderCluster")
				  .attr("transform", "translate(" + sliderMargin.left + "," + 74 + ")");
				  
	slider3.append("g")
		.attr("class", "x slideraxis")
		.attr("transform", "translate(0," + sliderHeight / 2 + ")")
		.call(d3.svg.axis()
		  .scale(xSCluster)
		  .orient("bottom")
		  .tickFormat(function(d) { return d; })
		  .tickSize(0)
		  .tickPadding(12))
	  .select(".domain")
	  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("class", "halo");

	brushslider3 = slider3.append("g")
		.attr("class", "brushslider")
		.call(brush3);

	brushslider3.selectAll(".extent,.resize")
		.remove();

	brushslider3.select(".background")
		.attr("height", sliderHeight);

	handle3 = brushslider3.append("circle")
		.attr("id","circleCluster")
		.attr("class", "brushhandle")
		.attr("transform", "translate(0," + sliderHeight / 2 + ")")
		.style("fill", greyColor)
		.style("pointer-events", "none")
		.attr("r", 5);

	/*brushslider3
		.call(brush3.event)
	  .transition() // gratuitous intro!
		.duration(750)
		.call(brush3.extent([0, 0]))
		.call(brush3.event);*/
		
}

function brushed() {
	var value = brush.extent()[0];
	

	if (d3.event.sourceEvent) { // not a programmatic event
		value = xS.invert(d3.mouse(this)[0]);
		brush.extent([value, value]);
	}

	handle1.attr("cx", xS(value));
	sliderVal = Math.round(value);

	drawChart();

}

function brushed2() {
	var value = brush2.extent()[0];
	

	if (d3.event.sourceEvent) { // not a programmatic event
		value = xS.invert(d3.mouse(this)[0]);
		brush2.extent([value, value]);
	}

	handle2.attr("cx", xS(value));
	sliderVal = Math.round(value);
	eventNo = Math.round(data.filter(isPositiveOrNegative).length/sliderVal);

	drawChart();

}

function brushed3() {
	var value = brush3.extent()[0];
	

	if (d3.event.sourceEvent) { // not a programmatic event
		value = xSCluster.invert(d3.mouse(this)[0]);
		brush3.extent([value, value]);
	}

	handle3.attr("cx", xSCluster(value));
	thresholdVal = round(value,2);
	sliderVal = n;
	console.log(thresholdVal);
	drawChart();

}

function filterSessions(input){
	var filtered = [];
	for(var i = 0; i < sessionArr.length; i++){
		filtered = filtered.concat(input.filter(function(d) { return d.sessionName == sessionArr[i] }));
	}
	
	return filtered;

}

// Function to round number to the nearest integer
function round(value, exp) {
	if (typeof exp === 'undefined' || +exp === 0)
		return Math.round(value);

	value = +value;
	exp  = +exp;

	if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
		return NaN;

	// Shift
	value = value.toString().split('e');
	value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

	// Shift back
	value = value.toString().split('e');
	return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}

function defineAreaFunction(){
	area = d3.svg.area()
		.interpolate(interpolationType)
		.y(function(d) { return y(d.sessionName); })
		.x0(function(d) { return tr_x(d.y0); })
		.x1(function(d) { return tr_x(d.y0 + d.y); });
	
}

function defineStackFunction(){
	// Define the stack
	stack = d3.layout.stack()
			.offset(offsetType)
			.values(function(d) { return d.dataArr; })
			.x(function(d){return d.sessionName;})
			.y(function(d){return d.noOfEvent;});
			
}

function Section(input){
	this.sectionName = input.sectionName;
	this.lowerBound = input.lowerBound;
	this.upperBound = input.upperBound;
	this.sectionLine = input.sectionLine;
	this.slices = input.slices;
	this.normalizedSlices = input.normalizedSlices;
	this.normalizedSlicesByCol = input.normalizedSlicesByCol;
	this.stackData = input.stackData;
	this.max = input.max;
}

function Slice(input){
	this.neg = input.neg;
	this.net = input.net;
	this.pos = input.pos;
}

function Dt(input){
	this.sessionName = input.sessionName;
	this.noOfEvent = input.noOfEvent;
	this.eventCat = input.eventCat;
}

function Line(input){
	this.x = input.x;
	this.text = input.text; 
	this.linePos = input.linePos;
}

// Function to check if it's a Positive event
function isPositive(element) {
	return element.eventCat == "Positive";
}

// Function to check if it's a Negative event
function isNegative(element) {
	return element.eventCat == "Negative";
}

// Function to check if it's a Neutral event
function isNeutral(element) {
	return element.eventCat == "Neutral";
}

function defineDragFunction(){
	drag = d3.behavior.drag()
			.on("dragstart", function(d){
				
				// update value of linePos to correspond with the value of its class
				cls = this.getAttribute('class')
				d.linePos = parseInt(cls.substring(7,cls.length));
				
				crossedLeftLine.length = 0;
				crossedRightLine.length = 0;
				chartToUpdate.length = 0;
				chartToUpdate.push(d.linePos);
				chartToUpdate.push(d.linePos+1);
				lowerBound = null;
				upperBound = null;
							
			})
			.on("drag", function(d) {
				

				d.x = x2(d3.event.x);
				d.text = round(d.x,2);
								
				if((d.x<(maxX+1)) && (d.x>(minX-1))){ // the line can only be dragged within the left and right most line
					d3.select(this)
						.attr("transform", function(d) { return "translate(" + d3.event.x + ")"; })
						.selectAll("text").text(function(d){ return d.text;});

					recalculateSummary(d);
					//redrawAffectedArea();
				
				}
			})
			.on("dragend", function(d){
				// Update sectionLineList
				updatedSectionLine = [];
				updatedSectionLine.length = 0;
				updatedSections = [];
				updatedSections.length =0;

				if(crossedLeftLine.length > 0)
					crossedLeft = crossedLeftLine[crossedLeftLine.length-1].linePos;
				else
					crossedLeft = d.linePos;
				
				for(var i=0; i<crossedLeft-1; i++){
					updatedSectionLine.push(sectionLineList[i]);	
					updatedSections.push(sections[i]);
				}
				//console.log(changedSections);
				newd = new Line({x:d.x, text:d.text, linePos:crossedLeft});
				updatedSectionLine.push(newd);
				updatedSections.push(changedSections[0]);
				updatedSections.push(changedSections[1]);
				//console.log(updatedSections);
				// update section class
				d3.selectAll(".section"+d.linePos)
					.attr("class", "section"+crossedLeft);
				
				if(crossedRightLine.length > 0)
					crossedRight = crossedRightLine[crossedRightLine.length-1].linePos;
				else
					crossedRight = d.linePos;
				//console.log(crossedRight);
				//console.log(x(sectionLineList[crossedRight+1].x)-x(newd.x));
				//console.log(sectionSize);
				//console.log(move);
				//console.log(window['newStackData'+2]);
				//var j=1;
				for(var i=crossedRight; i<sectionLineList.length; i++){
					// update section class
					crossedLeft++;
					d3.selectAll(".section"+sectionLineList[i].linePos)
						.attr("class", "section"+ crossedLeft);
					sectionLineList[i].linePos = crossedLeft	;
					line = new Line({x:sectionLineList[i].x, text:sectionLineList[i].text, linePos:crossedLeft});
					updatedSectionLine.push(line);
					
					//j++;
				}
				//console.log(updatedSectionLine);
				
				
				for(var i=crossedRight+1; i<sectionLineList.length; i++){
					sections[i].sectionName = i;
					sections[i].sectionLine.linePos = i;
					updatedSections.push(sections[i]);
				}

				// Update chart
				sectionNo = chartToUpdate[0];
				for(var i=chartToUpdate[chartToUpdate.length-1]; i<=sectionLineList.length; i++){
					
					d3.selectAll(".chart"+i)
						.attr("class", "chart"+(sectionNo+1));
						
					sectionNo++;
				}
				
				sectionLineList.length=0;
				sectionLineList = updatedSectionLine; 
				sections.length=0;
				sections = updatedSections;
				//console.log(sections);
				//console.log(sectionLineList);
				
			});
}

function recalculateSummary(line){

	// Check if current position of the dragged line cross the other line
	currentX = line.x;
	currentXPos = line.linePos;

	if(lowerBound === undefined || lowerBound === null){
		if(currentXPos==1)
			lowerBound = new Line({x:minX-1, text:round(minX-1,2), linePos: 0});
		else
			lowerBound = sectionLineList[line.linePos-2];
	}
	
	if(upperBound === undefined || upperBound === null){
		upperBound = sectionLineList[line.linePos];
	}
	
	if(currentX >= upperBound.x){
		// remove the line and add the removed line to the list
		if(d3.selectAll(".section"+upperBound.linePos).remove())
			crossedRightLine.push(sectionLineList[upperBound.linePos-1]);
		
		// remove chart 
		d3.selectAll(".chart"+upperBound.linePos).remove();
		
		// update upperBound
		upperBound = sectionLineList[upperBound.linePos];
		
		// get which chart to update
		if(chartToUpdate[chartToUpdate.length-1]!=upperBound.linePos)
			chartToUpdate.push(upperBound.linePos);
	}
	
	if(currentX <= lowerBound.x){
		// remove the line and add the removed line to the list
		if(d3.selectAll(".section"+lowerBound.linePos).remove())
			crossedLeftLine.push(sectionLineList[lowerBound.linePos-1]);
		
		// remove chart 
		d3.selectAll(".chart"+(lowerBound.linePos+1)).remove();
		
		// update lowerBound
		if(lowerBound.linePos==1)
			lowerBound = new Line({x:minX-1, text:round(minX-1,2), linePos: 0});
		else
			lowerBound = sectionLineList[lowerBound.linePos-2];
		
		// get which chart to update
		if(chartToUpdate[0]!=(lowerBound.linePos+1))
			chartToUpdate.push(lowerBound.linePos+1);
	}
	
	chartToUpdate.sort(sortStringAsc);
	changedLine.length = 0;
	changedLine.push(lowerBound.x);
	changedLine.push(currentX);
	changedLine.push(upperBound.x);

	changedSections.length = 0;
	/*if(crossedLeftLine.length>0)
		sectionName = line.linePos-1;
	else
		sectionName = line.linePos;*/
	sectionName = chartToUpdate[0];
	changedSections = recalculateSections(changedLine,sectionName);
	
	// Redraw Affected chart
	var j=0;
	for(var i=chartToUpdate[0]; i<=chartToUpdate[chartToUpdate.length-1]; i++){		
		if( (i==chartToUpdate[0]) || (i==chartToUpdate[chartToUpdate.length-1])){
			
			svg.selectAll('.chart'+i)
				  .selectAll("path")
				  .data(changedSections[j].stackData)
				  .attr("d", function(d) { return area(d.dataArr); })
				  .style("fill", function(d) { return d.color; });
						
			maxYAfterStacked = getMaxYOfSection(changedSections[j].stackData);
			sectionSize = x(changedSections[j].upperBound) - x(changedSections[j].lowerBound);
			
			svg.selectAll('.chart'+i)
				.attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(changedSections[j].lowerBound)) + "," + 0 + ")"; })
				.transition()
				.duration(2500);;

			j++;
		}
		
	}	
	
	console.log(changedSections);
	console.log(chartToUpdate);
}

function recalculateSections(inputList, inputSectionName){
	outputList = [];
	for(var i=0; i<inputList.length-1; i++){
			nexti = i+1;
			
			dataPerSection = data.filter(function(d){ return ((d.x > inputList[i]) && (d.x <= inputList[nexti]))});
			processSectionData(dataPerSection);
			//processSectionData(inputList[i],inputList[nexti]);

			newLine = new Line({x:inputList[nexti], text:round(inputList[nexti],2), linePos: inputSectionName});
			outputList.push(new Section(
			{	sectionName: inputSectionName,
				lowerBound: inputList[i],
				upperBound: inputList[nexti],
				sectionLine: newLine,
				slices: slices,
				normalizedSlices: normalizedSlices,
				normalizedSlicesByCol: normalizedSlicesByCol,
				stackData: stackData,
				max: max
			}));
			
			inputSectionName++;
	}
	
	return outputList;
}

function getMinSectionSize(input){
	var minSize = x(input[0].upperBound) - x(input[0].lowerBound);
	for(var i=1;i<input.length; i++){
		size = x(input[i].upperBound) - x(input[i].lowerBound);
		if( minSize >  size)
			minSize = size;
	}
	
	return minSize;
}

// Function to check if it's a Positive or negative event
function isPositiveOrNegative(element) {
	return ((element.eventCat == "Positive")||(element.eventCat == "Negative"));
}

