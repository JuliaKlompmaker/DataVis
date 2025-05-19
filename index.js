var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    innerRadius = 180,
    outerRadius = Math.min(width, height) / 2.3,
    g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var x = d3
	.scaleBand()
	.range([0, 2 * Math.PI])
	.align(0);

var y = d3.scaleLinear()
    .domain([0, 300])
    .range([innerRadius, outerRadius])


var z = d3.scaleOrdinal().range([
	"#395c8d", // #395c8d
	"#6967a8", // #6967a8
	"#714092", // #714092
	"#a14aa1", // #a14aa1
	"#a05d56", // #a05d56
	"#d0743c", // #d0743c
	"#ff8c00", // #ff8c00
]);

const line = d3
	.lineRadial()
	.curve(d3.curveLinearClosed)
	.angle((d) => x(d.Week));

var dotColor = d3.scaleOrdinal().range([
	"#b4c3d5", // lighter of #98abc5
	"#a3a1b6", // lighter of #8a89a6
	"#9681a0", // lighter of #7b6888
	"#866c83", // lighter of #6b486b
	"#bb7871", // lighter of #a05d56
	"#e08e5f", // lighter of #d0743c
	"#ffa733", // lighter of #ff8c00
]);
d3.csv("pollenData.csv", function (d, i, columns) {
	for (i = 2, t = 0; i < columns.length; ++i)
		t += d[columns[i]] = +d[columns[i]];
	d.total = t;
	return d;
})
	.then(function (data) {
		//Define selected key for legend click
		let selectedKey = null;

		x.domain(
			data.map(function (d) {
				return d.Week;
			})
		);
		y.domain([
			0,
			d3.max(data, function (d) {
				return d.total;
			}),
		]);
		z.domain(data.columns.slice(2));

		let pollenTypes = data.columns.slice(2);

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
		function drawStackedBars() {
			g.selectAll(".bars-group").remove();
			const barsGroup = g.append("g").attr("class", "bars-group");

			barsGroup
				.selectAll("g")
				.data(d3.stack().keys(data.columns.slice(2))(data))
				.enter()
				.append("g")
				.attr("fill", function (d) {
					return z(d.key);
				})
				.style("opacity", 0)
                .transition()
                .duration(2000)
                .style("opacity", 0.25)


                barsGroup
				.selectAll("g")
				.selectAll("path")
				.data(function (d) {
					return d;
				})
				.enter()
				.append("path")
				.attr("class", (d) => {
					return `bar-${d.data.Week}`;
				})
				.attr(
					"d",
					d3
						.arc()
						.innerRadius(function (d) {
							return y(d[0]);
						})
						.outerRadius(function (d) {
							return y(d[1]);
						})
						.startAngle(function (d) {
							return x(d.data.Week);
						})
						.endAngle(function (d) {
							return x(d.data.Week) + x.bandwidth();
						})
						.padAngle(0.01)
						.padRadius(innerRadius)
				);
		}
		function drawSingleBars(key) {
			g.selectAll(".single-bar-group").remove();
			const singleBarGroup = g.append("g").attr("class", "single-bar-group");
			singleBarGroup
				.selectAll("path")
				.data(data)
				.enter()
				.append("path")
                .attr("fill", z(key))
                .attr("opacity", 0)
                .transition()
                .duration(1000)
				.attr("opacity", 0.25)
				.attr(
					"d",
					d3
						.arc()
						.innerRadius(innerRadius)
						.outerRadius((d) => y(d[key]))
						.startAngle((d) => x(d.Week))
						.endAngle((d) => x(d.Week) + x.bandwidth())
						.padAngle(0.01)
						.padRadius(innerRadius)
				);
		}

		function drawDots(key = null, stacked = true) {
			g.selectAll(".dots-group").remove();
			let nodes = [];

			if (stacked) {
				// Stacked dots
				let keysToUse = key ? [key] : pollenTypes;
				const stackedData = d3.stack().keys(keysToUse)(data);

				stackedData.forEach((d) => {
					d.forEach((datum) => {
						const week = datum.data.Week;
						const angle = x(week) + x.bandwidth() / 2 - Math.PI / 2;
						const inner = y(datum[0]);
						const outer = y(datum[1]);
						const count = Math.floor((datum[1] - datum[0]) * 2);

						for (let i = 0; i < count; i++) {
							const r = inner + Math.random() * (outer - inner);

							nodes.push({
								week: week,
								type: d.key,
								angle: angle,
								radius: r,
								color: z(d.key),
								x: r * Math.cos(angle) + (Math.random() - 0.5),
								y: r * Math.sin(angle) + (Math.random() - 0.5),
								r0: inner,
								r1: outer,
								a0: x(week) - Math.PI / 2,
								a1: x(week) + x.bandwidth() - Math.PI / 2,
							});
						}
					});
				});
			} else {
				data.forEach((d) => {
					const week = d.Week;
					const angle = x(week) + x.bandwidth() / 2 - Math.PI / 2;
					const value = d[key];
					const inner = innerRadius;
					const outer = y(value);
					const count = Math.floor(value * 2);

					for (let i = 0; i < count; i++) {
						const r = inner + Math.random() * (outer - inner);
						nodes.push({
							week,
							type: key,
							angle,
							radius: r,
							color: z(key),
							x: r * Math.cos(angle) + (Math.random() - 0.5),
							y: r * Math.sin(angle) + (Math.random() - 0.5),
							r0: inner,
							r1: outer,
							a0: x(week) - Math.PI / 2,
							a1: x(week) + x.bandwidth() - Math.PI / 2,
						});
					}
				});
			}

    // bee-swarm simulation
    const simulation = d3
				.forceSimulation(nodes)
				.force("collide", d3.forceCollide(3).strength(2))
				.force(
					"x",
					d3.forceX((d) => d.radius * Math.cos(d.angle)).strength(0.5)
				)
				.force(
					"y",
					d3.forceY((d) => d.radius * Math.sin(d.angle)).strength(0.1)
				)
				.force("constrain", () => forceRadialBarConstraint(nodes));

			for (let i = 0; i < 100; i++) simulation.tick();

			// Draw dots
			g.append("g")
				.attr("class", "dots-group")
				.selectAll("circle")
				.data(nodes)
				.enter()
				.append("circle")
				.attr("r", () => Math.random() * 2)
				.attr("cx", (d) => d.x)
				.attr("cy", (d) => d.y)
                .attr("fill", (d) => d.color)
                .style("opacity", 0)
                .transition()
                .duration(1000)
                .style("opacity", 1)

		}

		function forceRadialBarConstraint(nodes) {
			for (let i = 0; i < nodes.length; i++) {
				const d = nodes[i];

				let r = Math.sqrt(d.x * d.x + d.y * d.y);
				let angle = Math.atan2(d.y, d.x);
				if (angle < 0) angle += 2 * Math.PI;

				let a = (angle + 2 * Math.PI) % (2 * Math.PI);
				let a0 = (d.a0 + 2 * Math.PI) % (2 * Math.PI);

				let a1 = (d.a1 + 2 * Math.PI) % (2 * Math.PI);

				const inArc = a0 < a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1;

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




    var label = g.append("g")
        .selectAll("g")
        .data(monthGroups)
        .enter().append("g")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) { return "rotate(" + ((x(d.Week) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)"; });

		label.append("line").attr("x2", -5).attr("stroke", "#000");

		label
			.append("text")
			.attr("transform", function (d) {
				return (d.angle + Math.PI / 2) % (2 * Math.PI) < Math.PI
					? "rotate(90)translate(0,16)"
					: "rotate(-90)translate(0,-9)";
			})
			.text(function (d) {
				return d.Month;
			});

		var yAxis = g.append("g").attr("text-anchor", "middle");

    var yTick = yAxis
        .selectAll("g")
        .data([0, 50, 100, 150, 200, 250, 300])
        .enter().append("g");

		yTick
			.append("circle")
			.attr("fill", "none")
			.attr("stroke", "#000")
			.attr("r", y);

		yTick
			.append("text")
			.attr("y", function (d) {
				return -y(d);
			})
			.attr("dy", "0.35em")
			.attr("fill", "none")
			.attr("stroke", "#fff")
			.attr("stroke-width", 5)
			.text(y.tickFormat(5, "s"));

		yTick
			.append("text")
			.attr("y", function (d) {
				return -y(d);
			})
			.attr("dy", "0.35em")
			.text(y.tickFormat(5, "s"));

    yAxis.append("text")
        .attr("y", function (d) { return -outerRadius; })
        .attr("dy", "-3em")
        .text("Number of pollen per m^3 of air");

		var legend = g
			.append("g")
			.selectAll("g")
			.data(data.columns.slice(2).reverse())
			.enter()
			.append("g")
			.attr("transform", function (d, i) {
				return (
					"translate(-40," + (i - (data.columns.length - 1) / 2) * 20 + ")"
				);
			});

		legend.append("rect").attr("width", 18).attr("height", 18).attr("fill", z);

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .text(function (d) { return d; });



    // clock arm
    var date = new Date()
    const getWeek = d3.utcFormat("%V")
    const getDate = d3.utcFormat("%d/%m/%Y")

    var currentWeek = getWeek(date)
    var angle = x(currentWeek) + x.bandwidth() / 2 - Math.PI / 2

    const offset = 6.5 * 10

    var x1 = innerRadius * Math.cos(angle)
    var y1 = innerRadius * Math.sin(angle)
    var x2 = (outerRadius+offset) * Math.cos(angle)
    var y2 = (outerRadius+offset) * Math.sin(angle)

    const isLeftSide = (angle > Math.PI / 2 || angle < -Math.PI / 2)

    g.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "maroon")
        .style("stroke-width", 2)


    const labelGroup = g.append("g")
        .attr("transform", `translate(${x2}, ${y2}) rotate(${(angle * 180 / Math.PI)})`);

    labelGroup.append("text")
        .text(getDate(date))
        .attr("dy", "0.35em")
        .attr("text-anchor", isLeftSide ? "start" : "end")
        .attr("font-size", "12px")
        .style("font-weight", "bold")
        .attr("dominant-baseline", "hanging")
        .attr("fill", "maroon")
        .attr("transform", function () {
            return isLeftSide ? "rotate(180)" : null;
        })

        legend.on("mouseover", function () {
            d3.select(this).select("text").style("font-weight", "bold");
        }).on("mouseout", function () {
            d3.select(this).select("text").style("font-weight", "normal");
        });

        legend.on("click", function (event, d) {
            if (selectedKey === d) {
                selectedKey = null;
                transitionOut(() => {
                    drawStackedBars();
                    drawDots();
                });

            } else {
                selectedKey = d;
                transitionOut(() => {
                    drawSingleBars(selectedKey);
                    drawDots(selectedKey, false);
                });
                }
        });

		drawStackedBars();
        drawDots();

        // transition for when bars/dots needs to dissapear
        function transitionOut(callback) {
            g.selectAll(".bars-group path, .single-bar-group path")
                .transition()
                .duration(600)
                .attrTween("d", function (d) {
                    // Handle stacked vs single bar
                    let week, startA, endA;
                    if (d.data && d[0] !== undefined && d[1] !== undefined) {
                        // stacked
                        week = d.data.Week;
                    } else {
                        // single
                        week = d.Week;
                    }

                    startA = x(week);
                    endA = startA + x.bandwidth();

                    const arc = d3.arc()
                        .innerRadius(innerRadius)
                        .outerRadius(innerRadius)
                        .startAngle(startA)
                        .endAngle(endA)
                        .padAngle(0.01)
                        .padRadius(innerRadius);

                    return () => arc(d);
                })
                .style("opacity", 0)
                .on("end", function (_, i, nodes) {
                    if (i === nodes.length - 1) callback(); // call once when last transition ends
                });

            g.selectAll(".dots-group circle")
                .transition()
                .duration(600)
                .attr("cx", d => innerRadius * Math.cos(d.angle))
                .attr("cy", d => innerRadius * Math.sin(d.angle))
                .style("opacity", 0)
                .on("end", function (_, i, nodes) {
                    if (i === nodes.length - 1) callback(); // safeguard if dots finish last
                });
        }


}).catch(function (error) {
    throw error;
});
