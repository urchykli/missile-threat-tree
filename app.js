// let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'
let csv = "./data3.csv";

const margin = { top: 80, right: 40, bottom: 140, left: 60 };
const fullWidth = 1200;
const fullHeight = 3000;
const width = fullWidth - margin.left - margin.right;
const height = fullHeight - margin.top - margin.bottom;
const yOffset = 45;
const xOffset = 10;
const devColor = "#F2C261";
const acqColor = "#5F7981";
const types = [];
const typeColors = ["#5F7981", "#F2C261", "#07344A", "#4A2C07", "#076796"];
let typeObj = [];
let obj = {};

async function parseData(csv) {
  nodes = await fetchCSV(csv).then((res) => {
    let child = [];
    let parent = [];
    let relationship = [];
    let years = {};
    res.forEach((missiles) => {
      // // Create child missile name
      let childMissile = missiles[0] + "," + missiles[3];

      let [
        country,
        inherited,
        method,
        missile,
        derivative,
        year,
        inPossession,
        type,
        url,
        annotation,
        icon,
        isMobile,
      ] = missiles;

      if (!years[year]) {
        years[year] = true;
      }

      // Push child missile name to child array
      child.push(childMissile);
      // Determine if missile was developed or acquired
      function getDerivative(developed) {
        return developed ? missiles[4] : missiles[3];
      }
      function parentCountry(developed) {
        return developed === "Development" || developed === "Rename"
          ? missiles[0]
          : missiles[2];
      }
      let parentMissile = "";
      // Determine if this is the root missile
      if (!missiles[2]) {
        // If root missile, add empty string to parentMissile
        parentMissile = "";
      } else {
        // If not root missile, create parent missile name
        parentMissile =
          parentCountry(missiles[2]) + "," + getDerivative(missiles[4]);
      }
      // Push parent missile name to parent array
      parent.push(parentMissile);

      relationship.push({
        name: childMissile,
        parent: parentMissile,
        inherited,
        year,
        inPossession,
        type,
        url,
        annotation,
        method,
        icon,
        isMobile,
      });

      if (!types.includes(type)) {
        types.push(type);
      }

      types.forEach((type, i) => {
        let typeVal = typeColors[i];
        obj[type] = typeVal;
      });
    });

    const mobileOnly = relationship.filter((d) => d.isMobile);
    let stratify = d3
      .stratify()
      .id((d) => d.name)
      .parentId((d) => d.parent);
    let fullSet = stratify(relationship);
    console.log(fullSet);
    let dataset = {
      years,
      fullSet,
      mobile: stratify(mobileOnly),
    };

    return dataset;
  });

  nodes.fullSet = d3.hierarchy(nodes.fullSet);
  nodes.mobile = d3.hierarchy(nodes.mobile);

  return nodes;
}

async function createTree() {
  const dataset = await parseData(csv);
  const mobile = dataset.mobile;
  const fullSet = dataset.fullSet;
  let data;

  // ---------------Determine data based on window size---------------

  function resizeTree(mql) {
    data = mql.matches ? mobile : fullSet;
  }
  let mql = window.matchMedia("(max-width: 700px)");
  mql.addListener(resizeTree);
  window.onload = resizeTree(mql);

  const findYears = await fetchCSV(csv);
  let years = [];
  findYears.forEach((missiles) => {
    years.push(missiles[5]);
  });
  const og = data.data.data;

  const minYear = d3.min(years);
  const maxYear = d3.max(years);

  // ---------------Tooltip---------------

  // Define the div for the tooltip
  let tooltip = document.getElementById("tooltip");

  tippy.setDefaultProps({
    animation: "fade",
    hideOnClick: true,
    interactive: true,
    onMount(tip) {
      let close = document.querySelector(".tooltip-close");

      if (!close) return;
      close.addEventListener("click", () => {
        tip.hide();
      });
    },
  });

  // ---------------Scale---------------

  let y_scale = d3
    .scaleLinear()
    .domain([minYear, maxYear])
    .range([margin.top, height]);

  // ---------------Axis---------------

  let y_axis = d3.axisLeft().scale(y_scale).tickFormat(d3.format("d"));

  y_axis.tickSize(-width);

  const tree = d3
    .tree()
    .size([width, height])
    .separation(function (a, b) {
      return a.parent == b.parent ? 0.5 : 1;
    });

  const svg = d3
    .select("body")
    .append("svg")
    .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
    .attr("role", "presentation");

  // ---------------Missile List for Ian---------------

  let missileList = d3.select("#missiles");

  let listItem = missileList
    .selectAll("li")
    .data(data.descendants())
    .enter()
    .append("li");

  let listGroup = listItem.append("g");

  let listSVG = listGroup.append("svg").attr("width", 110).attr("height", 30);
  // .attr("viewBox", `0 0 1 .5`)
  // .attr("preserveAspectRatio", "none");

  let listText = listGroup.append("text").text((d) => {
    return d.data.data.name;
  });

  let missileListIcons = listSVG
    .append("use")
    .attr("xlink:href", (d) => {
      let icon = d.data.data.icon;
      console.log(icon);
      return `./missiles/symbol-defs.svg#icon-${icon}`;
    })
    // .attr("transform", "scale(0.2)")
    // .attr("viewBox", `0 0 100 100`)
    .attr("width", 100)
    // .attr("class", "missile-image")
    .attr("height", 100)
    // .attr("x", 30)
    .attr("y", -30);

  // ---------------End Missile List for Ian---------------

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  let axis = g.append("g").call(y_axis).attr("stroke-opacity", 0.5);

  axis.selectAll(".tick line").attr("stroke", "#DFE4E7");
  axis.selectAll(".domain").attr("stroke", "#DFE4E7");

  g.selectAll(".tick text").attr("font-size", "20");

  // ---------------Tree links---------------

  const elbow = (d, i) => {
    yPosTarget = y_scale(d.target.data.data.year);
    yPosSource = y_scale(d.source.data.data.year);
    // -------------- Refactor --------------
    if (d.source.data.data === og && d.target.children) {
      return `M${d.source.x},${yPosSource + yOffset}H${
        d.target.x
      },V${yPosTarget}`;
    } else if (d.source.data.data === og && !d.target.children) {
      return `M${d.source.x},${yPosSource + yOffset}H${
        d.target.x
      },V${yPosTarget}`;
    } else if (d.source.children && d.target.children) {
      return `M${d.source.x},${yPosSource + yOffset}H${
        d.target.x
      },V${yPosTarget}`;
    } else {
      return `M${d.source.x},${yPosSource + yOffset}H${
        d.target.x
      },V${yPosTarget}`;
    }
  };

  let linkPath = d3
    .linkHorizontal()
    .x((d) => d.x)
    .y((d) => y_scale(d.data.data.year));

  let treeNodes = tree(data);
  let nodes = treeNodes.leaves(data);

  const link = g
    .selectAll(".link")
    .data(treeNodes.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", "#07344A")
    .attr("stroke-width", (d) => {
      let method = d.target.data.data.method;
      let target = d.target.data.id.split(",");
      let parent = d.target.data.data.parent.split(",");
      if (method === "Development") {
        return 3;
      }
    })
    .attr("d", elbow);
  // .style("stroke-dasharray", (d) => {
  //   let method = d.target.data.data.method;
  //   if (d.target.data.data.inherited) {
  //     return "10.3";
  //   }
  // });

  // ---------------Nodes---------------

  const node = g
    .selectAll(".node")
    .data(treeNodes.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("id", (d) => {
      return d.data.id;
    })
    .attr("transform", (d) => {
      yPos = y_scale(d.data.data.year);
      // -------------- Refactor --------------
      if (d.data.data === og) {
        return "translate(" + d.x + "," + yPos + ")";
      } else if (d.children) {
        return "translate(" + d.x + "," + yPos + ")";
      } else {
        return "translate(" + d.x + "," + yPos + ")";
      }
    });

  // ---------------Missile Rectangles---------------

  let missileRects = node
    .append("rect")
    .attr("width", 40)
    .attr("height", 10)
    .attr("x", 10)
    .attr("y", 13)
    .attr("class", "missile-rect")
    // .attr('id', d => {
    //   return 'node' + d.data.id
    // })
    .style("fill", (d) => {
      let type = d.data.data.type;
      return obj[type];
    });

  // ---------------Missiles---------------

  let missileIcons = node
    .append("use")
    .attr("xlink:href", (d) => {
      let icon = d.data.data.icon;
      return `./missiles/symbol-defs.svg#icon-${icon}`;
    })
    .attr("transform", "translate(0, 0) rotate(90)")
    .attr("width", 180)
    .attr("class", "missile-image")
    .attr("height", 100)
    .attr("x", -95)
    .attr("y", -48);

  // ---------------Country Label---------------

  let countryLabel = node
    .append("text")
    .attr("y", 10)
    .attr("x", 10)
    // .attr('text-anchor', 'middle')
    .text((d) => `${d.data.id.split(",")[0]} `)
    .attr("class", "missile-text missile-owner")
    .style("font-weight", "400");

  // ---------------Missile Label---------------

  let missileLabel = node
    .append("text")
    // .attr('x', d => {
    //   if (!d.children) {
    //     return xOffset
    //   }
    // })
    .attr("y", -5)
    .attr("x", 10)
    // .attr('text-anchor', 'middle')
    .text((d) => `${d.data.id.split(",")[1]} `)
    .attr("class", "missile-text missile-name")
    .style("font-weight", "300");

  // ---------------Container Rectangles---------------

  let bBox = d3.selectAll(".node").node().getBBox();

  let nodeRects = node
    .append("rect")
    .attr("x", bBox.x)
    .attr("y", bBox.y)
    .attr("class", "node-rect")
    .attr("width", 150)
    .attr("height", 110)
    .style("fill", "transparent")
    .on("mouseover", onMouseover)
    .on("mouseleave", onMouseLeave);

  // ---------------Tooltip---------------

  let tooltipInstance;

  if (!SVGElement.prototype.contains) {
    SVGElement.prototype.contains = HTMLDivElement.prototype.contains;
  }

  // ---------------Hover Event---------------

  function onMouseover(data) {
    let missile = data.data.data;
    let missileInfo = missile.name.split(",");
    // let country = missileInfo[0]
    let name = missileInfo[1];
    // let parentInfo = missile.parent.split(',')
    // let parentCountry = parentInfo[0]
    // let parentName = parentInfo[1]
    let method = "";

    if (!missile.parent) {
      method = "Created";
    } else if (missile.inherited) {
      method = "Inherited";
    } else if (missile.method === "Development") {
      method = "Developed";
    } else if (missile.method === "Rename") {
      method = "Renamed";
    } else {
      method = "Acquired";
    }

    const container = document.createElement("div");
    container.setAttribute("id", "parent");

    tooltip.content.querySelector(".tooltip__heading").innerHTML = name;
    tooltip.content.querySelector(".tooltip__method").innerHTML = method;
    tooltip.content.querySelector(".tooltip__year").innerHTML = missile.year;
    tooltip.content.querySelector(".tooltip__annotation").innerHTML =
      missile.annotation;
    tooltip.content
      .querySelector(".tooltip__more-info")
      .setAttribute("href", missile.url);

    const tooltipNode = document.importNode(tooltip.content, true);
    // Accessibility
    tooltip.setAttribute("aria-expanded", true);

    container.appendChild(tooltipNode);

    tooltipInstance = tippy(this, {
      content: container.innerHTML,
      appendTo: document.body,
      // popperOptions: {
      //   positionFixed: true
      // }
    });

    console.log(this.parentNode);

    let ancestors = data.ancestors();
    let descendants = data.descendants();
    descendants.shift();
    let family = ancestors.concat(descendants);

    missileRects
      .filter(function (d) {
        if (family.indexOf(d) !== -1) return true;
      })
      .style("fill", "red");

    link
      .filter(function (d) {
        if (family.indexOf(d.target) !== -1) return true;
      })
      .style("stroke", "orange");

    d3.select(".missile-text")
      .filter(function (d) {
        if (family.indexOf(d.target) !== -1) return true;
      })
      .style("font-weight", "bold");

    countryLabel
      .filter(function (d) {
        if (family.indexOf(d.target) !== -1) return true;
      })
      .style("font-weight", "900");
  }

  function onMouseLeave(d) {
    tooltip.setAttribute("aria-expanded", false);
    node.selectAll(".missile-rect").style("fill", (d) => {
      let type = d.data.data.type;
      return obj[type];
    });
    d3.select(this)
      .select(".missile-image")
      // .attr('transform', 'rotate(90)')
      .attr("width", 180)
      .attr("height", 100)
      .attr("x", -95)
      .attr("y", -48);

    link.style("stroke", "#07344A");
  }
}

function fetchCSV(src) {
  return d3.csv(src, (d) => {
    let dataArrays = Object.values(d);
    return dataArrays;
  });
}

createTree();
