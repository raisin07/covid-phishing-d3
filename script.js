// Charger les données de phishing
d3.csv("phishing_attacks.csv").then(data => {
    
    // Définir les dimensions de la carte
    const width = 800, height = 500;

    // Créer un élément SVG
    const svg = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Définir la projection de la carte
    const projection = d3.geoMercator()
        .scale(130)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Charger les données du monde
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(world => {
        
        // Mapper les attaques de phishing aux pays
        const phishingByCountry = {};
        data.forEach(d => {
            phishingByCountry[d.country] = +d.attacks;
        });

        // Définir l'échelle de couleur
        const colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([0, d3.max(data, d => d.attacks)]);

        // Dessiner la carte
        svg.append("g")
            .selectAll("path")
            .data(world.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                const country = d.properties.name;
                return phishingByCountry[country] ? colorScale(phishingByCountry[country]) : "#ccc";
            })
            .attr("stroke", "#fff");

    });

});
