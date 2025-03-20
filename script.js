// Charger les données
Promise.all([
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'),
    d3.csv('phishing_attacks.csv'),
    d3.csv('phishing_trends.csv')
]).then(([worldData, phishingData, trendsData]) => {

    document.getElementById("loading").style.display = "none"; // Masquer le message de chargement

    let countryPhishing = {};
    phishingData.forEach(d => {
        countryPhishing[d.country] = +d.attacks;
    });

    const countryNameCorrections = {
        "United States": "United States of America",
        "United Kingdom": "United Kingdom of Great Britain and Northern Ireland"
    };

    let countrySelect = document.getElementById("countryFilter");
    phishingData.forEach(d => {
        let option = document.createElement("option");
        option.value = d.country;
        option.textContent = d.country;
        countrySelect.appendChild(option);
    });

    // ======== AFFICHAGE DE LA CARTE ==========
    let svgMap = d3.select("#map").append("svg")
        .attr("width", 800)
        .attr("height", 500);

    let projection = d3.geoMercator().scale(130).translate([400, 250]);
    let path = d3.geoPath().projection(projection);

    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "5px")
        .style("font-size", "14px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    let countries = svgMap.append("g").selectAll("path")
        .data(worldData.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", d => {
            let country = d.properties.name;
            let normalizedCountry = countryNameCorrections[country] || country;
            return countryPhishing[normalizedCountry] ? d3.interpolateReds(countryPhishing[normalizedCountry] / 500) : "#ccc";
        })
        .attr("stroke", "#fff")
        .on("mouseover", function (event, d) {
            let country = d.properties.name;
            let normalizedCountry = countryNameCorrections[country] || country;
            let attackCount = countryPhishing[normalizedCountry] || 0;

            let selectedCountry = document.getElementById("countryFilter").value;
            if (selectedCountry !== "all" && normalizedCountry !== selectedCountry) return;

            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${normalizedCountry}</strong><br>${attackCount} attaques`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");

            d3.select(this).attr("fill", "orange");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function (event, d) {
            let country = d.properties.name;
            let normalizedCountry = countryNameCorrections[country] || country;
            let selectedCountry = document.getElementById("countryFilter").value;

            d3.select(this).attr("fill", (selectedCountry === "all" || normalizedCountry === selectedCountry) ?
                (countryPhishing[normalizedCountry] ? d3.interpolateReds(countryPhishing[normalizedCountry] / 500) : "#ccc") :
                "#eee");

            tooltip.transition().duration(300).style("opacity", 0);
        });

    // Filtrer les pays et griser les autres
    document.getElementById("countryFilter").addEventListener("change", function () {
        let selectedCountry = this.value;

        countries.transition()
            .duration(500)
            .attr("fill", d => {
                let country = d.properties.name;
                let normalizedCountry = countryNameCorrections[country] || country;
                if (selectedCountry === "all") {
                    return countryPhishing[normalizedCountry] ? d3.interpolateReds(countryPhishing[normalizedCountry] / 500) : "#ccc";
                }
                return normalizedCountry === selectedCountry ? d3.interpolateReds(countryPhishing[normalizedCountry] / 500) : "#eee";
            });
    });

    // ======== AFFICHAGE DU GRAPHIQUE ==========
    
    let chartCountrySelect = document.getElementById("chartCountryFilter");

    // Ajouter tous les pays à la liste déroulante du graphique
    let uniqueCountries = [...new Set(trendsData.map(d => d.country))];
    uniqueCountries.forEach(country => {
        let option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        chartCountrySelect.appendChild(option);
    });

    const width = 800, height = 400, margin = { top: 60, right: 100, bottom: 80, left: 80 };

    let svgLine = d3.select("#linechart").append("svg")
        .attr("width", width)
        .attr("height", height);

    let x = d3.scaleTime()
        .domain(d3.extent(trendsData, d => new Date(d.month)))
        .range([margin.left, width - margin.right]);

    let yLeft = d3.scaleLinear()
        .domain([0, d3.max(trendsData, d => +d.attacks) * 1.2])
        .range([height - margin.bottom, margin.top]);

    let yRight = d3.scaleLinear()
        .domain([0, d3.max(trendsData, d => +d.covid_cases) * 1.2])
        .range([height - margin.bottom, margin.top]);

    let lineAttacks = d3.line()
    .x(d => x(new Date(d.month)))
    .y(d => yLeft(+d.attacks))
    .curve(d3.curveCardinal);  // Arrondi la courbe

let lineCases = d3.line()
    .x(d => x(new Date(d.month)))
    .y(d => yRight(+d.covid_cases))
    .curve(d3.curveCardinal);  // Arrondi la courbe


    function updateChart(selectedCountry) {
        let filteredData = trendsData.filter(d => d.country === selectedCountry);

        svgLine.selectAll(".line").remove();

        if (filteredData.length === 0) return;

        svgLine.append("path")
            .datum(filteredData)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("opacity", 0.9)
            .attr("d", lineAttacks);

        svgLine.append("path")
            .datum(filteredData)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("opacity", 0.9)
            .attr("d", lineCases);
    }

    // Lien entre la liste déroulante du GRAPHIQUE et la mise à jour du graphique
    chartCountrySelect.addEventListener("change", function () {
        updateChart(this.value);
    });

    // Affichage initial avec le premier pays de la liste du graphique
    updateChart(uniqueCountries[0]);

    // ========== Ajout des axes X et Y avec labels ==========
    svgLine.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svgLine.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yLeft));

    svgLine.append("g")
        .attr("transform", `translate(${width - margin.right},0)`)
        .call(d3.axisRight(yRight));

    // Ajout du label pour l'axe X
    svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Date");

    // Ajout du label pour l'axe Y (Phishing)
    svgLine.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", margin.left / 3)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Nombre d'attaques de phishing");

    // Ajout du label pour l'axe Y droit (Cas COVID-19)
    svgLine.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", width - margin.right + 60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Nombre de cas COVID-19");


    // Gestion du mode sombre
document.getElementById("toggleTheme").addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    // Mise à jour du texte du bouton en fonction du mode
    if (document.body.classList.contains("dark-mode")) {
        this.textContent = "☀️ Mode clair";
    } else {
        this.textContent = "🌙 Mode sombre";
    }
});


}).catch(error => console.error("Erreur de chargement des données :", error));
