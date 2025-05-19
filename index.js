var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    innerRadius = 180,
    outerRadius = Math.min(width, height) / 2,
    g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var x = d3.scaleBand()
    .range([0, 2 * Math.PI])
    .align(0);

var y = d3.scaleRadial()
    .range([innerRadius, outerRadius]);

var z = d3.scaleOrdinal()
    .range([
        "#395c8d", // #395c8d 
        "#6967a8", // #6967a8
        "#714092", // #714092
        "#a14aa1", // #a14aa1
        "#a05d56", // #a05d56
        "#d0743c", // #d0743c
        "#ff8c00" // #ff8c00
    ]);

const line = d3.lineRadial()
    .curve(d3.curveLinearClosed)
    .angle(d => x(d.Week));

var dotColor = d3.scaleOrdinal()
    .range([
        "#b4c3d5", // lighter of #98abc5
        "#a3a1b6", // lighter of #8a89a6
        "#9681a0", // lighter of #7b6888
        "#866c83", // lighter of #6b486b
        "#bb7871", // lighter of #a05d56
        "#e08e5f", // lighter of #d0743c
        "#ffa733"  // lighter of #ff8c00
    ])
d3.csv("pollenData.csv", function (d, i, columns) {
    for (i = 2, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
    d.total = t;
    return d;
}).then(function (data) {

    addInfoBox()

    x.domain(data.map(function (d) { return d.Week; }));
    y.domain([0, d3.max(data, function (d) { return d.total; })]);
    z.domain(data.columns.slice(2));
    let monthGroups = Array.from(
        d3.group(data, (d) => d.Month),
        ([month, weeks]) => {
            let centerWeek = weeks[Math.floor(weeks.length / 2)];
            let centerAngle = d3.mean(
                weeks.map((w) => x(w.Week) + x.bandwidth() / 2)
            );
            return { Month: month, Week: centerWeek.Week, angle: centerAngle };
        }
    );
    g.append("g")
        .selectAll("g")
        .data(d3.stack().keys(data.columns.slice(2))(data))
        .enter().append("g")
        .attr("fill", function (d) { return z(d.key); })
        .style("opacity", 0.25)
        .selectAll("path")
        .data(function (d) { return d; })
        .enter().append("path")
        .attr("class", d => {

            return `bar-${d.data.Week}`
        })
        .attr("d", d3.arc()
            .innerRadius(function (d) { return y(d[0]); })
            .outerRadius(function (d) { return y(d[1]); })
            .startAngle(function (d) { return x(d.data.Week); })
            .endAngle(function (d) { return x(d.data.Week) + x.bandwidth(); })
            .padAngle(0.01)
            .padRadius(innerRadius))
        .on("mouseover", () => {
          d3.select("#pollen-type").text(`Type - ${key}`)
          d3.select("#pollen-week").text(`Week - ${point.week}`)
          d3.select("#pollen-value").text(`Pollen count - ${point.value} pollen/m³`)

        })



    const stackedData = d3.stack().keys(data.columns.slice(2))(data);
    let nodes = [];

    stackedData.forEach(d => {
        const key = d.key;

        d.forEach(d => {
            const week = d.data.Week;
            const angle = x(week) + x.bandwidth() / 2 - Math.PI / 2;

            const inner = y(d[0]); // start of this type's bar
            const outer = y(d[1]); // end of this type's bar

            const count = Math.floor((d[1] - d[0]) * 2); // Adjust multiplier

            for (let i = 0; i < count; i++) {
                // Random radius within the slice
                const r = inner + Math.random() * (outer - inner);

                nodes.push({
                    week: week,
                    type: key,
                    value: d[1] - d[0],
                    angle: angle,
                    radius: r,
                    color: z(key),
                    x: r * Math.cos(angle) + (Math.random() - 0.5),
                    y: r * Math.sin(angle) + (Math.random() - 0.5),
                    r0: inner,
                    r1: outer,
                    a0: x(week) - Math.PI / 2,
                    a1: x(week) + x.bandwidth() - Math.PI / 2
                });
            }
        });
    });


    // bee-swarm simulation
    const simulation = d3.forceSimulation(nodes)
        .force("collide", d3.forceCollide(3).strength(2))
        .force("x", d3.forceX(d => d.radius * Math.cos(d.angle)).strength(0.5))
        .force("y", d3.forceY(d => d.radius * Math.sin(d.angle)).strength(0.1))
        .force("constrain", () => forceRadialBarConstraint())


    //make it move constantly
    for (let i = 0; i < 100; i++) {
        simulation.tick();
        
    }

    const swarm = g.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", () => Math.random() * 2)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("fill", d => d.color);



    function forceRadialBarConstraint() {
        for (let i = 0; i < nodes.length; i++) {
            const d = nodes[i];

            let r = Math.sqrt(d.x * d.x + d.y * d.y);
            let angle = Math.atan2(d.y, d.x);
            if (angle < 0) angle += 2 * Math.PI;

            let a = (angle + 2 * Math.PI) % (2 * Math.PI);
            let a0 = (d.a0 + 2 * Math.PI) % (2 * Math.PI);

            let a1 = (d.a1 + 2 * Math.PI) % (2 * Math.PI);

            const inArc = (a0 < a1)
                ? a >= a0 && a <= a1
                : a >= a0 || a <= a1;

            if (!inArc) {
                const distToStart = Math.abs(a - a0);
                const distToEnd = Math.abs(a - a1);
                angle = distToStart < distToEnd ? d.a0 : d.a1;
            }

            // If outside radius, clamp
            if (r < d.r0) r = d.r0;
            if (r > d.r1) r = d.r1;

            d.x = r * Math.cos(angle);
            d.y = r * Math.sin(angle);
        }
    }



    /*//Constant movement
    function randomJiggle() {
      nodes.forEach(d => {
          d.vx *= 0.9; // damping
          d.vx += (Math.random() - 0.5) * 0.05;
          d.vy = 0;
      });
  }*/
    var label = g.append("g")
        .selectAll("g")
        .data(monthGroups)
        .enter().append("g")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) { return "rotate(" + ((x(d.Week) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)"; });

    label.append("line")
        .attr("x2", -5)
        .attr("stroke", "#000");

    label.append("text")
        .attr("transform", function (d) { return (d.angle + Math.PI / 2) % (2 * Math.PI) < Math.PI ? "rotate(90)translate(0,16)" : "rotate(-90)translate(0,-9)"; })
        .text(function (d) { return d.Month; });

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
        .attr("y", function (d) { return -y(d); })
        .attr("dy", "0.35em")
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 5)
        .text(y.tickFormat(5, "s"));

    yTick.append("text")
        .attr("y", function (d) { return -y(d); })
        .attr("dy", "0.35em")
        .text(y.tickFormat(5, "s"));

    yAxis.append("text")
        .attr("y", function (d) { return -y(y.ticks(5).pop()); })
        .attr("dy", "-1em")
        .text("Number of pollen per m^3 of air");

    var legend = g.append("g")
        .selectAll("g")
        .data(data.columns.slice(2).reverse())
        .enter().append("g")
        .attr("transform", function (d, i) { return "translate(-40," + (i - (data.columns.length - 1) / 2) * 20 + ")"; });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", z);

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .text(function (d) { return d; });
}).catch(function (error) {
    throw error;
});


function addInfoBox(){
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