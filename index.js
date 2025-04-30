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
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

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
    for (i = 1, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
    d.total = t;
    return d;
}, function (error, data) {
    if (error) throw error;



    x.domain(data.map(function (d) { return d.Week; }));
    y.domain([0, d3.max(data, function (d) { return d.total; })]);
    z.domain(data.columns.slice(1));

    g.append("g")
        .selectAll("g")
        .data(d3.stack().keys(data.columns.slice(1))(data))
        .enter().append("g")
        .attr("fill", function (d) { return z(d.key); })

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
            .padRadius(innerRadius));


    let nodes = [];

    data.forEach(d => {
        data.columns.slice(1).forEach(type => {
            const count = Math.floor(d[type] * 2); // Adjust granularity
            const angle = x(d.Week) + x.bandwidth() / 2 - Math.PI / 2;
            const radius = (y(d[type]) + y(0)) / 2; // Middle of the arc
            console.log(data)

            for (let i = 0; i < count; i++) {
                nodes.push({
                    week: d.Week,
                    type: type,
                    value: d[type],
                    color: dotColor(type),
                    angle: angle,
                    radius: radius,
                    
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle),
                });
            }
        });
    });

    // bee-swarm simulation
    const simulation = d3.forceSimulation(nodes)
        //.force("radial", d3.forceRadial(d => d.radius, 0, 0).strength(0.5))
        //.force("jiggle", d3.forceManyBody().strength(-0.2))
        .force("collide", d3.forceCollide(3).strength(1))
        .force("x", d3.forceX(d => d.radius * Math.cos(d.angle)).strength(0.5))
        .force("y", d3.forceY(d => d.radius * Math.sin(d.angle)).strength(0.1))
        .force("constrain", () => forceRadialBarConstraint())
        /*.force("boundary", forceBoundary(function (d) {
            //console.log(d)
            var bar = d3.select(`.bar-${d.week}`)
            console.log(bar.node().getBoundingClientRect())
            var x0 = bar.node().getBoundingClientRect().left
            var x1 = bar.node().getBoundingClientRect().right
            var y0 = bar.node().getBoundingClientRect().top
            var y1 = bar.node().getBoundingClientRect().bottom
            return x0, y0, x1, y1
        }))*/
        // circle radius
        //.alphaDecay(0.005)  // default is 0.0228
        .on("tick", ticked);

        

    const swarm = g.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", () => Math.random()*2)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("fill", d => d.color);


    function ticked() {
        swarm
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    function forceRadialBarConstraint() {
        for (let i = 0; i < nodes.length; i++) {
            const d = nodes[i];

            // Compute current polar coords
            let r = Math.sqrt(d.x * d.x + d.y * d.y);
            let angle = Math.atan2(d.y, d.x);

            // Normalize angle to [0, 2π)
            if (angle < 0) angle += 2 * Math.PI;

            /*
            .innerRadius(function (d) { return y(d[0]); })
              .outerRadius(function (d) { return y(d[1]); })
              .startAngle(function (d) { return x(d.data.Week); })
              .endAngle(function (d) { return x(d.data.Week) + x.bandwidth(); })
              .padAngle(0.01)
              .padRadius(innerRadius));
            */

            const startAngle = x(d.week);
            const endAngle = x(d.week) + x.bandwidth();
            const r0 = y(0);
            const r1 = y(d.value);

            // If outside angle, clamp
            if (angle < startAngle) angle = endAngle; // this is the problem line!!
            if (angle > endAngle) angle = endAngle;

            // If outside radius, clamp
            if (r < r0) r = r0;
            if (r > r1) r = r1;

            // Convert back to Cartesian
            d.x = r * Math.cos(angle);
            d.y = r * Math.sin(angle);
        }
    }



    var label = g.append("g")
        .selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) { return "rotate(" + ((x(d.Week) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)"; });

    label.append("line")
        .attr("x2", -5)
        .attr("stroke", "#000");

    label.append("text")
        .attr("transform", function (d) { return (x(d.Week) + x.bandwidth() / 2 + Math.PI / 2) % (2 * Math.PI) < Math.PI ? "rotate(90)translate(0,16)" : "rotate(-90)translate(0,-9)"; })
        .text(function (d) { return d.Week; });

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
        .data(data.columns.slice(1).reverse())
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
});



