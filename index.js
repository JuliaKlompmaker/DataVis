var svg = d3.select("svg")
const radialWidth = 960
const radialHeight = 960
const innerRadius = 180
const outerRadius = Math.min(radialWidth, radialHeight) / 2

var globalData
var bandChartData

d3.csv("pollenData.csv", function(d, i, columns) {
  for (i = 1, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
  d.total = t;
  return d;
}, function(error, data) {
  if (error) throw error;

globalData = data

bandChartData = data.map(d => {
  const clone = { ...d };
  delete clone.total;
  return clone;
})

drawRadialChart(globalData, false)

})

function drawRadialChart(data, clear) {
  if (clear) d3.select("svg").selectAll("*").remove()
  d3.select("#info-box").remove()

  svg.attr("width", radialWidth).attr("height", radialHeight)

  var g = svg.append("g").attr("transform", "translate(" + radialWidth / 2 + "," + radialHeight / 2 + ")");

  var x = d3.scaleBand()
      .range([0, 2 * Math.PI])
      .align(0);

  var y = d3.scaleRadial()
      .range([innerRadius, outerRadius]);

  var z = d3.scaleOrdinal()
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
      
  x.domain(data.map(function(d) { return d.Week; }));
    y.domain([0, d3.max(data, function(d) { return d.total; })]);
    z.domain(data.columns.slice(1));

    drawRadialChartPaths.call(this,{g, x, y, z, data});

  var label = g.append("g")
    .selectAll("g")
    .data(data)
    .enter().append("g")
      .attr("text-anchor", "middle")
      .attr("transform", function(d) { return "rotate(" + ((x(d.Week) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)"; });

  label.append("line")
      .attr("x2", -5)
      .attr("stroke", "#000");

  label.append("text")
      .attr("transform", function(d) { return (x(d.Week) + x.bandwidth() / 2 + Math.PI / 2) % (2 * Math.PI) < Math.PI ? "rotate(90)translate(0,16)" : "rotate(-90)translate(0,-9)"; })
      .text(function(d) { return d.Week; });

  var yAxis = g.append("g")
      .attr("text-anchor", "middle");

  var yTick = yAxis
    .selectAll("g")
    .data(y.ticks(5).slice(1))
    .enter().append("g");

  yTick.append("circle")
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("r", y);

  yTick.append("text")
      .attr("y", function(d) { return -y(d); })
      .attr("dy", "0.35em")
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", 5)
      .text(y.tickFormat(5, "s"));

  yTick.append("text")
      .attr("y", function(d) { return -y(d); })
      .attr("dy", "0.35em")
      .text(y.tickFormat(5, "s"));

  yAxis.append("text")
      .attr("y", function(d) { return -y(y.ticks(5).pop()); })
      .attr("dy", "-1em")
      .text("Number of pollen per m^3 of air");

  var legend = g.append("g")
    .selectAll("g")
    .data(data.columns.slice(1).reverse())
    .enter().append("g")
      .attr("transform", function(d, i) { return "translate(-40," + (i - (data.columns.length - 1) / 2) * 20 + ")"; });

  legend.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", z);

  legend.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text(function(d) { return d; });
};

function drawRadialChartPaths({g, x, y, z, data}) {
    g.append("g")
      .selectAll("g")
      .data(d3.stack().keys(data.columns.slice(1))(data))
      .enter().append("g")
        .attr("fill", function(d) { return z(d.key); })
      .selectAll("path")
      .data(function(d) { return d; })
      .enter().append("path")
        .attr("d", d3.arc()
            .innerRadius(function(d) { return y(d[0]); })
            .outerRadius(function(d) { return y(d[1]); })
            .startAngle(function(d) { return x(d.data.Week); })
            .endAngle(function(d) { return x(d.data.Week) + x.bandwidth(); })
            .padAngle(0.01)
            .padRadius(innerRadius));
}


  


function drawBandChart(bandChartData) {
  d3.select("svg").selectAll("*").remove(); // Clear previous chart

  const margin = {top: 50, right: 10, bottom: 30, left: 100};
  const bandWidth = 900;
  const bandHeight = 600 - margin.top - margin.bottom;

  const svg = d3.select("svg")
    .attr("width", bandWidth + margin.left + margin.right)
    .attr("height", bandHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left-60},${margin.top})`)

  addInfoBox()

  const keys = Object.keys(bandChartData[0]).slice(1); // pollen types
  const x = d3.scaleLinear()
    .domain([0, bandChartData.length - 1])
    .range([0, bandWidth]);

  const yBand = d3.scaleBand()
    .domain(keys)
    .range([0, bandHeight])
    .paddingInner(0.1);

  drawSeries({svg, x, yBand, keys, bandChartData, bandWidth});

  // X-axis
  svg.append("g")
    .attr("transform", `translate(0, ${bandHeight})`)
    .call(d3.axisBottom(x).ticks(bandChartData.length).tickFormat((d, i) => bandChartData[i].Week));
}

function drawSeries({svg, x, yBand, keys, bandChartData, bandWidth}) {
  keys.forEach((key, i) => {
    const series = bandChartData.map((d, index) => ({
      value: +d[key],
      week: d.Week,
      index
    }))

    // Local scale for this pollen type's intensity
    const localY = d3.scaleLinear()
      .domain([0, d3.max(series, d => d.value)])
      .range([yBand.bandwidth(), 0]);

    const area = d3.area()
      .x((d, i) => x(i))
      .y0(() => yBand.bandwidth()) // bottom of image
      .y1(d => localY(d.value))
      .curve(d3.curveMonotoneX)

    // Define clipPath based on the area shape
    svg.append("clipPath")
      .attr("id", "clip-" + key)
      .append("path")
      .datum(series)
      .attr("transform", `translate(0, ${yBand(key)})`)
      .attr("d", area);

    // Add the image inside the clipped area
    svg.append("image")
      .attr("href", `images/${key}.jpg`)
      .attr("x", 0)
      .attr("y", yBand(key))
      .attr("height", yBand.bandwidth())
      .attr("width", bandWidth)
      .attr("clip-path", `url(#clip-${key})`)
      .attr("preserveAspectRatio", "xMidYMid slice")

    // Draw the line on top for visual clarity
    const line = d3.line()
      .x((d, i) => x(i))
      .y(d => localY(d.value))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(series)
      .attr("transform", `translate(0, ${yBand(key)})`)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "lightgrey")
      .attr("stroke-width", 1);

    // Add label
    svg.append("text")
      .attr("x", -10)
      .attr("y", yBand(key) + yBand.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(key)


    series.forEach((point, j) => {
      svg.append("circle")
        .attr("cx", x(point.index))
        .attr("cy", yBand(key) + localY(point.value))
        .attr("r", 7)
        .attr("fill", "transparent")
        .on("mouseover", () => {
          d3.select("#pollen-type").text(`Type - ${key}`)
          d3.select("#pollen-week").text(`Week - ${point.week}`)
          d3.select("#pollen-value").text(`Pollen count - ${point.value} pollen/m³`)

        })
        .on("mouseout", () => {
          tooltip.transition().duration(500).style("opacity", 0)
        })

    });
  });
}

function addInfoBox() {
  d3.select("#info-box").remove()

  d3.select("body")
    .append("div")
    .attr("id", "info-box")
    .style("position", "absolute")
    .style("top", "50px")
    .style("left", "1250px") 
    .style("padding", "10px")
    .style("border", "1px solid #ccc")
    .style("background-color", "#f9f9f9")
    .style("font-family", "sans-serif")
    .html(`<h3>Pollen Info</h3>
          <p id="pollen-type">Type —</p>
          <p id="pollen-week">Week —</p>
          <p id="pollen-value">Pollen count —</p>`)

}