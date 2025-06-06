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


// Ajouter les pays à la liste déroulante du graphique (multi-sélection)
let uniqueCountries = [...new Set(trendsData.map(d => d.country))];
uniqueCountries.forEach(country => {
    let option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    chartCountrySelect.appendChild(option);
});

const width = 800, height = 400, margin = { top: 60, right: 110, bottom: 80, left: 90 };

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

let color = d3.scaleOrdinal(d3.schemeCategory10);

let lineAttacks = d3.line()
    .x(d => x(new Date(d.month)))
    .y(d => yLeft(+d.attacks))
    .curve(d3.curveCardinal);

let lineCases = d3.line()
    .x(d => x(new Date(d.month)))
    .y(d => yRight(+d.covid_cases))
    .curve(d3.curveCardinal);

// Axes X et Y
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

// Labels axes
svgLine.append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Date");

svgLine.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", margin.left / 3)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Nombre d'attaques de phishing");

svgLine.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", width - margin.right + 60)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Nombre de cas COVID-19");

// Fonction pour mettre à jour le graphique avec sélection multiple
function updateMultiCountryChart(selectedCountries) {
    svgLine.selectAll(".line-attacks, .line-cases").remove();

    if(selectedCountries.includes("all")) {
        selectedCountries = uniqueCountries;
    }

    const showPhishing = document.getElementById("showPhishing").checked;
    const showCovid = document.getElementById("showCovid").checked;

    selectedCountries.forEach(country => {
        let filteredData = trendsData.filter(d => d.country === country);

        if(showPhishing){
            svgLine.append("path")
                .datum(filteredData)
                .attr("class", "line-attacks")
                .attr("fill", "none")
                .attr("stroke", color(country))
                .attr("stroke-width", 2)
                .attr("opacity", 0.8)
                .attr("d", lineAttacks);
        }

        if(showCovid){
            svgLine.append("path")
                .datum(filteredData)
                .attr("class", "line-cases")
                .attr("fill", "none")
                .attr("stroke", color(country))
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.8)
                .attr("d", lineCases);
        }
    });
}

// Écouteur pour les changements sur la sélection des pays
chartCountrySelect.addEventListener("change", function () {
    let selectedOptions = Array.from(this.selectedOptions).map(option => option.value);
    updateMultiCountryChart(selectedOptions);
});

// Écouteurs pour les changements sur les cases à cocher
document.getElementById("showPhishing").addEventListener("change", () => {
    let selectedOptions = Array.from(chartCountrySelect.selectedOptions).map(option => option.value);
    updateMultiCountryChart(selectedOptions);
});

document.getElementById("showCovid").addEventListener("change", () => {
    let selectedOptions = Array.from(chartCountrySelect.selectedOptions).map(option => option.value);
    updateMultiCountryChart(selectedOptions);
});

// Initialisation (vide au démarrage)
updateMultiCountryChart([]);


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

