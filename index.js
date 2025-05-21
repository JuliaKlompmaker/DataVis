var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    innerRadius = 130,
    outerRadius = height / 3.2,
    g = svg
        .append("g")
        .attr("transform", "translate(" + width / 2.8 + "," + height / 2.3 + ")");

var x = d3
    .scaleBand()
    .range([0, 2 * Math.PI])
    .align(0);

var y = d3.scaleLinear().domain([0, 300]).range([innerRadius, outerRadius]);

var z = d3
    .scaleOrdinal()
    .range(["#36a620", "#cfa543", "#399283", "#20502e", "#8ba849", "#265582"]);

d3.csv("pollenData.csv", function (d, i, columns) {
    for (i = 2, t = 0; i < columns.length; ++i)
        t += d[columns[i]] = +d[columns[i]];
    d.total = t;
    return d;
})
    .then(function (data) {
        addTitle();
        addPollenBox();
        addInfoBox();
        addBackgroundContainer();
        

        //Define selected key for legend click
        let selectedKey = null;

        x.domain(
            data.map(function (d) {
                return d.Week;
            })
        );
        y.domain([0, 300]);
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

        var label = g
            .append("g")
            .selectAll("g")
            .data(monthGroups)
            .enter()
            .append("g")
            .attr("text-anchor", "middle")
            .attr("transform", function (d) {
                return (
                    "rotate(" +
                    (((x(d.Week) + x.bandwidth() / 2) * 180) / Math.PI - 90) +
                    ")translate(" +
                    innerRadius +
                    ",0)"
                );
            });

        label.append("line").attr("class", "label-line").attr("x2", -5);

        label
            .append("text")
            .attr("class", "label-text")
            .attr("transform", function (d) {
                return (d.angle + Math.PI / 2) % (2 * Math.PI) < Math.PI
                    ? "rotate(90)translate(0,16)"
                    : "rotate(-90)translate(0,-9)";
            })
            .text(function (d) {
                return d.Month;
            });

        createYAxis();


        var legendItems = data.columns.slice(2).reverse().concat("All");

        var legend = g
            .append("g")
            .selectAll("g")
            .data(legendItems)
            .enter()
            .append("g")
            .attr("class", function (d) {
                return d === "All" ? "legend legend-all hidden" : "legend";
            })
            .attr("transform", function (d, i) {
                return "translate(-40," + (i - (legendItems.length - 1) / 2) * 20 + ")";
            });

        // Rectangles
        legend.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            
            .attr("fill", function (d) {
                return d === "All" ? "transparent" : z(d);
            })
            .attr("stroke", function (d) {
                return d === "All" ? "black" : "none";
            });

        // Labels
        legend.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .attr("class", "legend-text")
            .text(function (d) {
                return d;
            });

        // clock arm
        drawClockArm()
        

        legend.on("click", function (event, d) {
            selectedKey = selectedKey === d ? null : d;

            legend.selectAll(".legend-text").classed("selected", false);

            transitionOut(() => {
                addInfoBox();

                if (selectedKey === null || selectedKey == "All") {
                    d3.select(".legend-all").classed("hidden", true);
                    updateInfoBox("About");
                    drawStackedBars(data);
                    drawDots(null, true, data);
                    hidePollenBackground();
                } else {
                    d3.select(".legend-all").classed("hidden", false);
                    
                    d3.select(this).select(".legend-text").classed("selected", true);
                    drawSingleBars(selectedKey, data);
                    drawDots(selectedKey, false, data);
                    showPollenBackground(selectedKey);
                    updateInfoBox(selectedKey);

                    d3.select(".legend-group").append
                }
            });
            
            
        });

        drawStackedBars(data);
        drawDots(null, true, data);

    })
    

function drawStackedBars(data) {
    g.selectAll(".bars-group").remove();
    const barsGroup = g.append("g").attr("class", "bars-group");

    y.domain([0, 300]);
    transitionYAxisIn();

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
        .style("opacity", 0.25);

    barsGroup
        .selectAll("g")
        .selectAll("path")
        .data(function (d) {
            return d.map((segment) => {
                segment.key = d.key;
                return segment;
            });
        })
        .enter()
        .append("path")
        .attr("class", (d) => {
            return `bar-${d.data.Week}`;
        })
        .attr("d", d3.arc()
                    .innerRadius(function (d) { return y(d[0]) })
                    .outerRadius(function (d) { return y(d[1]) })
                    .startAngle(function (d) { return x(d.data.Week) })
                    .endAngle(function (d) { return x(d.data.Week) + x.bandwidth() })
                    .padAngle(0.01)
                    .padRadius(innerRadius)
        )
        .on("mouseover", function (event, d) {
            const pollenType = d.key;
            const count = d.data[d.key];
            const color = checkPollenCount(pollenType, count);

            d3.select("#pollen-type").text(`Type - ${pollenType}`);
            d3.select("#pollen-week").text(`Week - ${d.data.Week}`);
            d3.select("#pollen-value")
                .text(`Pollen count - ${count} pollen/m³`)
                .style("color", color);

            const description = getPollenDescription(color);
            d3.select("#pollen-description").html(description);

            showPollenBackground(pollenType);
        });
}

function drawSingleBars(key, data) {
    g.selectAll(".single-bar-group").remove();
    const singleBarGroup = g.append("g").attr("class", "single-bar-group");

    y.domain([0, d3.max(data, (d) => d[key])]);

    transitionYAxisOut();

    singleBarGroup
        .selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("fill", z(key))
        .attr("opacity", 0)
        .on("mouseover", function (event, d) {
            const count = d[key];
            const color = checkPollenCount(key, count);

            d3.select("#pollen-type").text(`Type - ${key}`);
            d3.select("#pollen-week").text(`Week - ${d.Week}`);
            d3.select("#pollen-value")
                .text(`Pollen count - ${count} pollen/m³`)
                .style("color", color);

            const description = getPollenDescription(color);
            d3.select("#pollen-description").html(description);
        })
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

function drawDots(key = null, stacked = true, data) {
    g.selectAll(".dots-group").remove();
    let pollenTypes = data.columns.slice(2);
    let nodes = [];

    if (stacked) {
        processStackedDots(key, nodes, data, pollenTypes);
    } else {
        data.forEach((d) => {
            const week = d.Week;
            const angle = x(week) + x.bandwidth() / 2 - Math.PI / 2;
            const value = d[key];
            const inner = innerRadius;
            const outer = y(value);
            const count = Math.floor(value * 1.5);

            for (let i = 0; i < count; i++) {
                const r = inner + Math.random() * (outer - inner);
                nodes.push({
                    week,
                    type: key,
                    angle,
                    radius: r,
                    color: z(key),
                    x: r * Math.cos(angle) + (Math.random() - 0.7),
                    y: r * Math.sin(angle) + (Math.random() - 0.7),
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
        .force("x", d3.forceX((d) => d.radius * Math.cos(d.angle)).strength(0.6))
        .force("y", d3.forceY((d) => d.radius * Math.sin(d.angle)).strength(0.1))
        .force("constrain", () => forceRadialBarConstraint(nodes));

    for (let i = 0; i < 100; i++) {
        simulation.tick();
    }

    forceRadialBarConstraint(nodes);

    // Draw dots
    g.append("g")
        .attr("class", "dots-group")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", () => Math.random() * (1.3 - 0.6) + 0.6)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("fill", (d) => d.color)
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);
}

function processStackedDots(key, nodes, data, pollenTypes) {
    let keysToUse = key ? [key] : pollenTypes;
    const stackedData = d3.stack().keys(keysToUse)(data);

    stackedData.forEach((d) => {
        d.forEach((datum) => {
            const week = datum.data.Week;
            const angle = x(week) + x.bandwidth() / 2 - Math.PI / 2;
            const inner = y(datum[0]);
            const outer = y(datum[1]);
            const count = Math.floor((datum[1] - datum[0]) * 1.5);

            for (let i = 0; i < count; i++) {
                const r = inner + Math.random() * (outer - inner);

                nodes.push({
                    week: week,
                    type: d.key,
                    angle: angle,
                    radius: r,
                    color: z(d.key),
                    x: r * Math.cos(angle) + (Math.random() - 0.7),
                    y: r * Math.sin(angle) + (Math.random() - 0.7),
                    r0: inner,
                    r1: outer,
                    a0: x(week) - Math.PI / 2,
                    a1: x(week) + x.bandwidth() - Math.PI / 2,
                });
            }
        });
    });
}

function forceRadialBarConstraint(nodes) {
    for (let i = 0; i < nodes.length; i++) {
        const d = nodes[i];

        // Convert Cartesian to polar
        let r = Math.sqrt(d.x * d.x + d.y * d.y);
        let angle = Math.atan2(d.y, d.x);
        if (angle < 0) angle += 2 * Math.PI;

        let a = (angle + 2 * Math.PI) % (2 * Math.PI);
        let a0 = (d.a0 + 2 * Math.PI) % (2 * Math.PI);
        let a1 = (d.a1 + 2 * Math.PI) % (2 * Math.PI);

        const inArc = a0 < a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1;

        const marginAngle = 0.01; // in radians (~0.57 degrees)

        // Clamp angle to a slightly random offset inside the arc boundary if outside
        if (!inArc) {
            const distToStart = Math.abs((a - a0 + 2 * Math.PI) % (2 * Math.PI));
            const distToEnd = Math.abs((a - a1 + 2 * Math.PI) % (2 * Math.PI));
            if (distToStart < distToEnd) {
                // Add a random margin inside the arc
                angle =
                    d.a0 +
                    marginAngle +
                    Math.random() * (x.bandwidth() / 2 - marginAngle);
            } else {
                angle =
                    d.a1 -
                    marginAngle -
                    Math.random() * (x.bandwidth() / 2 - marginAngle);
            }
        }

        const marginRadius = 2; // Adjust as needed (in pixels)

        // Clamp radius to stay randomly inside the bar, away from edges
        r =
            d.r0 +
            marginRadius +
            Math.random() * Math.max(0, d.r1 - d.r0 - 2 * marginRadius);

        // Forcefully reposition node
        d.x = r * Math.cos(angle);
        d.y = r * Math.sin(angle);
    }
}

function drawClockArm() {
    var date = new Date();
        const getWeek = d3.utcFormat("%V");
        const getDate = d3.utcFormat("%d/%m/%Y");

        var currentWeek = getWeek(date);
        var angle = x(currentWeek) + x.bandwidth() / 2 - Math.PI / 2;

        const offset = 6.5 * 12; // char size * 12 chars

        var x1 = innerRadius * Math.cos(angle);
        var y1 = innerRadius * Math.sin(angle);
        var x2 = (outerRadius + offset) * Math.cos(angle);
        var y2 = (outerRadius + offset) * Math.sin(angle);

        const isLeftSide = angle > Math.PI / 2 || angle < -Math.PI / 2;

        g.append("line")
            .attr("class", "clock-arm")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2);

        const labelGroup = g
            .append("g")
            .attr(
                "transform",
                `translate(${x2}, ${y2}) rotate(${(angle * 180) / Math.PI})`
            );

        labelGroup
            .append("text")
            .attr("class", "clock-text")
            .text(getDate(date))
            .attr("dy", "0.35em")
            .attr("text-anchor", isLeftSide ? "start" : "end")
            .attr("transform", function () {
                return isLeftSide ? "rotate(180)" : null;
            });
}

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

            const arc = d3
                .arc()
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
        .attr("cx", (d) => innerRadius * Math.cos(d.angle))
        .attr("cy", (d) => innerRadius * Math.sin(d.angle))
        .style("opacity", 0)
        .on("end", function (_, i, nodes) {
            if (i === nodes.length - 1) callback(); // safeguard if dots finish last
        });
}

function addTitle() {
    d3.select("body")
        .append("div")
        .attr("class", "title")
        .attr("transform", `translate(20,20)`)
        .html(`<h1>The invisible season of pollen</h1>`);
}

const pollenBackgrounds = {
    Birch: "./images/birch.jpg",
    Hazel: "images/hazel.jpg",
    Alder: "images/alder.jpg",
    Grass: "images/grass.jpg",
    Elm: "images/elm.jpg",
    Mugwort: "images/mugwort.jpg",
};

function addBackgroundContainer() {
    d3.select("body").append("div").attr("id", "pollen-background");
}

let currentImage = null;

function showPollenBackground(type) {
    const imageUrl = pollenBackgrounds[type];

    if (currentImage === imageUrl) return;

    currentImage = imageUrl;

    d3.select("#pollen-background")
        .transition()
        .duration(200)
        .style("opacity", 0)
        .on("end", () => {
            d3.select("#pollen-background")
                .style("background-image", `url(${imageUrl})`)
                .transition()
                .duration(400)
                .style("opacity", 0.3);
        });
}

function hidePollenBackground() {
    d3.select("#pollen-background").style("opacity", 0);
}

function addPollenBox() {
    d3.select("#pollen-box").remove();

    d3.select("body").append("div").attr("id", "pollen-box")
        .html(`<h3 style="margin-top: 0;">Pollen Info</h3>
          <p id="pollen-type">Type —</p>
          <p id="pollen-week">Week —</p>
          <p id="pollen-value">Pollen count —</p>
          <p id="pollen-description"</p>`);
}

function checkPollenCount(type, count) {
    if (type === "Birch") {
        return evaluatePollenCount(count, 100, 30);
    } else if (type === "Hazel") {
        return evaluatePollenCount(count, 15, 5);
    } else {
        return evaluatePollenCount(count, 50, 10);
    }
}

function evaluatePollenCount(count, redThreshold, yellowThreshold) {
    if (count >= redThreshold) return "#FF0000";
    else if (count >= yellowThreshold) return "#FFDB58";
    else return "#6aa84f";
}

function getPollenDescription(color) {
    const hexToName = {
        "#FF0000": "red",
        "#FFDB58": "yellow",
        "#6aa84f": "green",
    };

    const messages = {
        green: `Pollen levels are <span style="color: #6aa84f">low</span>. Minimal symptoms are expected`,
        yellow: `Pollen levels are <span style="color: #FFDB58">moderate</span>. Some individuals may experience mild symptoms`,
        red: `Pollen levels are <span style="color: #FF0000">high</span>. People with allergies may experience strong symptoms`,
    };
    const name = hexToName[color];

    return `${messages[name]}`;
}

function addInfoBox() {
    d3.select("#info-box").remove();

    d3.select("body").append("div").attr("id", "info-box").html(`
            <h3 id="info-head" style="margin-top: 0; font-size: 1.2em;">About Pollen</h3>
            <p id="pollen-info">
                In Latin pollen translates to fine dust. The specs of pollen are so small they are not immediately visible for the naked eye.
                In this visualization we look at the six largest allergy-inducing pollen types: bunch, grass, birch, elm, hazel and alder.
                <br>
                <br>
                Upwards of 1.000.000 Danes suffer from pollen allergy. The most common symptoms of pollen allergy are red and itchy eyes, stuffy nose and uncontrollable sneezing.
                Some people describe fever-like symptoms and general fatigue. <br><br>
                The pollen season starts in January and ends in September. In early spring elm and hazel peaks, whereas grass makes its entrance later in the early summer months.
                Feel free to explore the different pollen types and their ebbs and flows throughout the year by pressing on the square by the name.

            </p>
        `);
}

function updateInfoBox(type) {
    const descriptions = {
        Birch: `The birch is a common tree that resides in forests and bogs but can also be found in gardens and by
        the street in cities. It is the most allergy inducing type of pollen from trees that Danes with pollen
        allergy have a reaction to. <br><br>Birch usually has a short, but intense season from mid-April to mid-May.
        The pollen of birches can travel several hundred kilometers by the wind. <br><br>If you suffer from allergy to birch,
        you might also react to alder and hazel. If you have a cross allergy the most common foods that cause similar
        symptoms are apples, tomatoes and hazelnuts.`,
        Hazel: `Hazel is 3-5 meter tall bush from the birch-family. The pollen count for hazel is usually quite low,
        despite pollen production being high. This is because hazel often grows in the shadow of larger trees in the
        forest. This prohibits hazel pollen from spreading in the wind. <br><br> Free growing hazel in private gardens can
        cause very local peaks that are not reported here. <br><br> The season for hazel pollen is from January to March.`,
        Alder: `The most common types of alder trees found in Denmark are the black alder and grey alder.
        The black alder is common by lake shores and streams. The grey alder is common in gardens, parks and forests.
        <br><br> The pollen season for alder trees is from late-January to April. Usually, the pollen count peaks in March.
        If you are allergic to birch pollen, you might also be sensitive to alder pollen.`,
        Grass: `Grass pollens are not transported very far from the original plant. Despite this allergy to grass is one of
        the most common and inhibiting allergies in Denmark. This is because there is grass almost all over the country,
        in ditches, fields, parks and gardens. <br><br> There exist more than 100 different types of grass, but if you are
        allergic to one type, most likely you are also allergic to the other.
        The season of grass pollen starts in mid-May and lasts until start-September.`,
        Elm: `The most common type of elm tree in Denmark is the wych elm. It grows in forests across the entire country.
        The season for elm is from February to the start of May. <br><br>
        Cross allergies are rare, if you suffer from allergy to elm.`,
        Mugwort: `Mugwort (Artemisia Vulgaris) is a common weed that grows on roadsides, fallow fields and in the forest. The pollen is spread by the wind.
        The season for mugwort normally stretches from mid-June to September. <br><br>
        Suffering from allergy towards mugwort can also result in cross allergy. The most common foods that cause
        similar symptoms are sunflower seeds, melon and carrots.`,
        About: `In Latin pollen translates to fine dust. The specs of pollen are so small they are not immediately visible for the naked eye.
        In this visualization we look at the six largest allergy-inducing pollen types: bunch, grass, birch, elm, hazel and alder.<br><br>
        Upwards of 1.000.000 Danes suffer from pollen allergy. The most common symptoms of pollen allergy are red and itchy eyes, stuffy nose and uncontrollable sneezing.
        Some people describe fever-like symptoms and general fatigue. <br><br>
        The pollen season starts in January and ends in September. In early spring elm and hazel peaks, whereas grass makes its entrance later in the early summer months.
        Feel free to explore the different pollen types and their ebbs and flows throughout the year by pressing on the square by the name.`,
    };

    const content = descriptions[type];
    const infoBox = d3.select("#pollen-info");

    // Clear content first
    infoBox.html("");

    // Create a dummy <div> to parse HTML tags properly
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const nodes = Array.from(tempDiv.childNodes);

    let i = 0;

    function typeNextNode() {
        if (i < nodes.length) {
            const node = nodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
                // Type out text character by character
                let text = node.textContent;
                let span = document.createElement("span");
                infoBox.node().appendChild(span);
                let j = 0;

                function typeChar() {
                    if (j < text.length) {
                        span.textContent += text[j++];
                        setTimeout(typeChar, 2); // adjust speed
                    } else {
                        i++;
                        typeNextNode();
                    }
                }
                typeChar();
            } else {
                // For elements like <br>, <b>, etc., append instantly
                infoBox.node().appendChild(node.cloneNode(true));
                i++;
                setTimeout(typeNextNode, 10); // short delay between nodes
            }
        }
    }

    typeNextNode();

    if (type === "About") {
        return;
    } else {
        d3.select("#info-head").html(`${type}`);
    }
}

function createYAxis() {
    d3.select(".y-axis").remove();

    var yAxis = g
        .append("g")
        .attr("text-anchor", "middle")
        .attr("class", "y-axis");

    var yTick = yAxis
        .selectAll("g")
        .data(y.ticks(6))
        .enter()
        .append("g")
        .attr("class", "y-axis-tick");

    yTick.append("circle").attr("class", "y-tick-circle").attr("r", y);

    yTick
        .append("text")
        .attr("class", "y-tick-text-bg")
        .attr("y", function (d) {
            return -y(d);
        })
        .attr("dy", "0.35em")
        .text(y.tickFormat(6, "s"));

    yTick
        .append("text")
        .attr("class", "y-tick-text")
        .attr("y", function (d) {
            return -y(d);
        })
        .attr("dy", "0.35em")
        .text(y.tickFormat(6, "s"));

    yAxis
        .append("text")
        .attr("class", "y-axis-title")
        .attr("y", function (d) {
            return -outerRadius;
        })
        .attr("dy", "-3em")
        .text("Pollen particles per cubic meter of air");
}

/**
 * In \texttt{transitionYAxisOut()} the ticks fade out 
 * while the circles expand outwards before they are removed. 
 * The new cirles then emerge form center, giving the impression of zooming out.
 */
function transitionYAxisOut() {
    const t = d3.transition().duration(1000);

    const ticks = y.ticks(6);

    const yAxis = g.select(".y-axis");

    // JOIN new data with old elements, using tick value as key
    const yTick = yAxis.selectAll(".y-axis-tick").data(ticks, (d) => d); // <-- key function for stability

    yTick
        .exit()
        .each(function (d) {
            d3.select(this)
                .transition(t)
                .style("opacity", 0)
                .select("circle")
                .attr("r", outerRadius * 1.2); // grow outward

            d3.select(this)
                .transition(t)
                .selectAll("text")
                .attr("y", -outerRadius * 1.2);
        })
        .transition(t)
        .on("end", function () {
            d3.select(this).remove();
        });

    // ENTER new ticks
    const yTickEnter = yTick
        .enter()
        .append("g")
        .attr("class", "y-axis-tick")
        .style("opacity", 0); // start invisible

    yTickEnter.append("circle").attr("class", "y-tick-circle").attr("r", 0); // start from center

    yTickEnter
        .append("text")
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("class", "y-tick-text-bg")
        .text((d) => y.tickFormat(6, "s")(d));

    yTickEnter
        .append("text")
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("class", "y-tick-text")
        .text((d) => y.tickFormat(6, "s")(d));

    // UPDATE + ENTER
    const yTickMerge = yTickEnter.merge(yTick);

    yTickMerge.transition(t).style("opacity", 1);

    yTickMerge
        .select("circle")
        .transition(t)
        .attr("r", (d) => y(d));

    yTickMerge
        .selectAll("text")
        .transition(t)
        .attr("y", (d) => -y(d));
}

/**
 * the \texttt{transitionYAxisIn()} creates a zoom in effect 
 * where the old circles fade out 
 * and new circles appear from the outer edge and shrink inward to their correct radius
 */
function transitionYAxisIn() {
    var t = d3.transition().duration(1000);

    var ticks = y.ticks(6);
    var yAxis = g.select(".y-axis");

    // DATA JOIN — bind ticks to group elements
    var tickJoin = yAxis.selectAll(".y-axis-tick").data(ticks, (d) => d);

    // EXIT — old tick groups
    tickJoin.exit().transition(t).style("opacity", 0).remove();

    // ENTER — new tick groups
    var yTickEnter = tickJoin
        .enter()
        .append("g")
        .attr("class", "y-axis-tick")
        .style("opacity", 0); // start invisible

    yTickEnter
        .append("circle")
        .attr("class", "y-tick-circle")
        .attr("r", outerRadius); // start from outerRadius

    yTickEnter
        .append("text")
        .attr("y", -outerRadius)
        .attr("dy", "0.35em")
        .attr("class", "y-tick-text-bg")
        .text(y.tickFormat(6, "s"));

    yTickEnter
        .append("text")
        .attr("y", -outerRadius)
        .attr("dy", "0.35em")
        .attr("class", "y-tick-text")
        .text(y.tickFormat(6, "s"));

    // MERGE — for update + enter selection
    var yTickMerge = yTickEnter.merge(tickJoin);

    yTickMerge.transition(t).style("opacity", 1);

    yTickMerge
        .select("circle")
        .transition(t)
        .attr("r", (d) => y(d));

    yTickMerge
        .selectAll("text")
        .transition(t)
        .attr("y", (d) => -y(d));
}
