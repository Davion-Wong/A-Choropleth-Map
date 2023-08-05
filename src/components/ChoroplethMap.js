import React, {useState, useEffect} from "react";
import { feature } from 'topojson-client';
import * as d3 from 'd3';

const ChoroplethMap = () => {
  
  const [usData, setUsData] = useState(null);
  const [educationData, setEducationData] = useState(null);

  useEffect(() => {
    // Fetch data inside this useEffect and update your state
    const fetchData = async () => {
      const usRes = await fetch('https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json');
      const usData = await usRes.json();
      setUsData(usData);

      const eduRes = await fetch('https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json');
      const eduData = await eduRes.json();
      setEducationData(eduData);
    }

    fetchData();
  }, []);

  useEffect(() => {
    // Render the map here when the data is fetched
    if (usData && educationData) {
      // Render your map here using d3.js

      const margin = { top: 20, right: 120, bottom: 20, left: 120 };
      // Use d3.select to select the existing 'svg' if it exists
      let svg = d3.select('#choropleth-map').select('svg');

      // If there's no 'svg' element in '#choropleth-map', create a new one
      if (svg.empty()) {
        svg = d3.select('#choropleth-map')
                .append('svg')
                .attr('width', 1440 - margin.left - margin.right)
                .attr('height', 960 - margin.top - margin.bottom);
      }

      const colorScale = d3.scaleQuantize()
                           .range(["#ddddff", "#bbbbff", "#9999ff", "#7777ff", "#5555ff", "#3333ff"])
                           .domain([d3.min(educationData, d => d.bachelorsOrHigher), 
                                    d3.max(educationData, d => d.bachelorsOrHigher)]);
      const minEducation = d3.min(educationData, d => d.bachelorsOrHigher);
      const quantiles = colorScale.range().map((color) => {
        return colorScale.invertExtent(color)[1];
      });
      quantiles.unshift(minEducation);
                                    
      const path = d3.geoPath();

      // Append a 'g' element in which to place the map
      const map = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);  // Adjusts the position of the map by shifting it 100 pixels down

      

      // Create a group for the tooltip
      // const tooltip = d3.select('#choropleth-map')
      //     .append('foreignObject')
      //     .attr("id", "tooltip")
      //     .attr('width', 'auto')  // Set the width to auto
      //     .attr('height', 'auto') // Set the height to auto
      //     .style('overflow', 'visible') // Make sure the tooltip doesn't get cut off          
      //     .style("visibility", "hidden");

          // Create a tooltip directly under '#choropleth-map'
          const tooltipDiv = d3.select('#choropleth-map')
            .append("div")
            .attr("id", "tooltip")
            .style("position", "absolute") // Position it absolutely
            .style("background-color", "#cccccc") // Your preferred background color
            .style("opacity", 0.8)  // You may want to make it semi-transparent
            .style("padding", "10px") // Add some padding
            .style("visibility", "hidden"); // Start with the tooltip hidden

          tooltipDiv.append("text")
            .attr("id", "tooltip-text")
            .style("color", "black");  // Set the text color

          // Append a rect for the tooltip background
          tooltipDiv.append("rect")
              .attr("id", "tooltip-box")
              .attr("width", 200) // Adjust as needed
              .attr("height", 50) // Adjust as needed
              .attr("fill", "#cccccc") // Your preferred background color
              .style("opacity", 0.8);  // You may want to make it semi-transparent

      // // Append a text for the tooltip text
      // tooltip.append("text")
      //     .attr("id", "tooltip-text")
      //     .attr("x", 10) // Position the text 10px from the left edge of the rect
      //     .attr("y", 30); // Position the text in the middle of the rect

      map.selectAll('path')
        .data(feature(usData, usData.objects.counties).features)
        .join('path')
        .attr('class', 'county')
        .attr('d', path)
        .attr("data-fips", function(d) {            
          const county = educationData.find(county => county.fips === d.id);
          return county ? county.fips : '';
        })
        .attr("data-education", d => {
          let county = educationData.find(item => item.fips === d.id);
          return county ? county.bachelorsOrHigher : 0;
        })
        .attr("fill", d => {
          let county = educationData.find(item => item.fips === d.id);
          let percentage = county ? county.bachelorsOrHigher : 0;
          return colorScale(percentage);
        })
        .on('mouseover', function(event, d) {
          // Find the county data for the path that triggered the event
          const county = educationData.find(county => county.fips === d.id);
  
          // Update tooltip contents
          let tooltipText = tooltipDiv.select("#tooltip-text")
          .attr("data-education", county ? county.bachelorsOrHigher : 0) // Set the data-education attribute
          .text(`${county.area_name}, ${county.state}: ${county.bachelorsOrHigher}%`); // Update the tooltip text

          // Get the width of the tooltip text
          let textWidth = tooltipText.node().offsetWidth;

          // Use the text width to set the width of the tooltip div
          tooltipDiv.style("width", textWidth + "px");

          // Get the x and y coordinates of the event relative to the svg container
          let [x, y] = d3.pointer(event, map.node());

          
          // Set the fill color to yellow
          d3.select(this).attr('fill', 'yellow');

          // Update tooltip position and visibility
          tooltipDiv.style('left', (event.clientX - 50) + 'px')
                    .style('top', (event.clientY - 150) + 'px')
                    .style("visibility", "visible");
          })
        .on('mouseout', function() {
            // Hide the tooltip when the mouse leaves the path
            tooltipDiv.style("visibility", "hidden");

            
            // Reset the fill color to its original color
            d3.select(this).attr('fill', d => {
              let county = educationData.find(item => item.fips === d.id);
              let percentage = county ? county.bachelorsOrHigher : 0;
              return colorScale(percentage);
            });
        });
  

      const legendWidth = 300;
      const legendHeight = 20;
      const legendMargin = { top: 30, right: 60, bottom: 30, left: 560 };
      const legendColorScale = d3.scaleThreshold()
          .domain(quantiles)
          .range(colorScale.range());

      const legendX = d3.scaleLinear()
          .domain([d3.min(quantiles), d3.max(quantiles)])
          .range([0, legendWidth]);

      const legend = svg.append("g")
          .attr("id", "legend")
          .attr("transform", "translate(" + legendMargin.left + "," + legendMargin.top + ")");

      legend.selectAll("rect")
            .data(legendColorScale.range())
            .enter()
            .append("rect")
            .attr("height", legendHeight)
            .attr("x", (d, i) => legendX(quantiles[i]))
            .attr("width", legendWidth / legendColorScale.range().length)
            .attr("fill", d => d);

      const legendXAxis = d3.axisBottom(legendX)
                            .tickValues(quantiles)
                            .tickFormat(d3.format(".0f"));

      legend.append("g")
            .attr("transform", "translate(0," + legendHeight + ")")
            .call(legendXAxis);

      const totalCountyPaths = document.querySelectorAll('.county').length;
      const totalDataPoints = educationData.length;

      

      if (totalCountyPaths !== totalDataPoints) {
        console.warn(`Warning: The number of SVG paths (${totalCountyPaths}) does not match the number of data points (${totalDataPoints}).`);
      }
    }
  }, [usData, educationData]);


  return (
    <div id="choropleth-map">
      <h1 id="title">US Education Levels by County</h1>
      <p id="description">A choropleth map showing the percentage of adults age 25 and older with a bachelor's degree or higher (2010-2014)</p>
    </div>
  );
}

export default ChoroplethMap;