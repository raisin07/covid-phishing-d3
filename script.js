// Charger les données COVID et Phishing
Promise.all([
    d3.json('https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/latest/owid-covid-latest.json'),
    d3.csv('phishing_attacks.csv')
]).then(([covidData, phishingData]) => {
    
    // Transformer les données pour la carte
    let countryPhishing = {};
    phishingData.forEach(d => {
        countryPhishing[d.country] = +d.attacks;
    });

    // Projection de la carte du monde
    let svg = d3.select("#map").append("svg")
        .attr("width", 800)
        .attr("height", 500);
    
    let projection = d3.geoMercator().scale(130).translate([400, 250]);
    let path = d3.geoPath().projection(projection);
    
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then(world => {
        svg.append("g")
            .selectAll("path")
            .data(world.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                let country = d.properties.name;
                return countryPhishing[country] ? d3.interpolateReds(countryPhishing[country] / 1000) : "#ccc";
            })
            .attr("stroke", "#fff");
    });

    // Graphique de l'évolution des attaques de phishing
    d3.csv("phishing_trends.csv").then(data => {
        data.forEach(d => {
            d.attacks = +d.attacks;
            d.covid_cases = +d.covid_cases;
        });

        const width = 800, height = 400, margin = { top: 80, right: 50, bottom: 50, left: 80 };
        const svg = d3.select("#linechart").append("svg")
            .attr("width", width)
            .attr("height", height);

        const x = d3.scalePoint()
            .domain(data.map(d => d.month))
            .range([margin.left, width - margin.right]);

        const y1 = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.attacks)])
            .range([height - margin.bottom, margin.top]);

        const y2 = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.covid_cases)])
            .range([height - margin.bottom, margin.top]);

        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y1));

        svg.append("g")
            .attr("transform", `translate(${width - margin.right},0)`)
            .call(d3.axisRight(y2));

        const linePhishing = d3.line()
            .x(d => x(d.month))
            .y(d => y1(d.attacks));

        const lineCovid = d3.line()
            .x(d => x(d.month))
            .y(d => y2(d.covid_cases));

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", linePhishing);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", lineCovid);

        // Supprimer uniquement les anciennes légendes pour éviter la duplication
        svg.selectAll(".legend").remove();

        // Ajouter la légende pour les attaques de phishing (rouge)
        svg.append("text")
            .attr("class", "legend")
            .attr("x", width / 2 - 50)  
            .attr("y", margin.top - 40)  
            .attr("fill", "red")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Attaques de phishing");

        // Ajouter la légende pour les cas COVID-19 (bleu)
        svg.append("text")
            .attr("class", "legend")
            .attr("x", width / 2 + 100)  
            .attr("y", margin.top - 40)
            .attr("fill", "blue")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Cas COVID-19");
    });
});
