// let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'
let csv = './data1.csv'

const margin = { top: 40, right: 40, bottom: 140, left: 40 }
const fullWidth = 1700
const fullHeight = 3000
const width = fullWidth - margin.left - margin.right
const height = fullHeight - margin.top - margin.bottom
const yOffset = 45
const xOffset = 10
const devColor = "#F2C261"
const acqColor = '#5F7981'

async function parseData(csv) {
  nodes = await fetchCSV(csv).then(res => {
    let child = []
    let parent = []
    let relationship = []
    res.forEach(missiles => {
      // Create child missile name
      let childMissile = missiles[0] + ',' + missiles[3]

      // Push child missile name to child array
      child.push(childMissile)
      // Determine if missile was developed or acquired
      function getDerivative(developed) {
        return (developed ? missiles[4] : missiles[3])
      }
      function parentCountry(developed) {
        return (developed === 'Development' || developed === 'Rename' ? missiles[0] : missiles[2])
      }
      let parentMissile = ""
      // Determine if this is the root missile
      if (!missiles[2]) {
        // If root missile, add empty string to parentMissile
        parentMissile = ""
      } else {
        // If not root missile, create parent missile name
        parentMissile = parentCountry(missiles[2]) + ',' + getDerivative(missiles[4])
      }
      // Push parent missile name to parent array
      parent.push(parentMissile)

      relationship.push({
        'name': childMissile,
        'parent': parentMissile,
        'inherited': missiles[1],
        'year': missiles[5],
        'inPossession': missiles[6],
        'range': missiles[7],
        'url': missiles[8],
        'annotation': missiles[9],
        'method': missiles[2]
      })
    })
    let stratify = d3.stratify()
      .id(d => d.name)
      .parentId(d => d.parent)
    let root = stratify(relationship)

    return root
  })
  return d3.hierarchy(nodes)
}

async function createTree() {

  const data = await parseData(csv)
  const findYears = await fetchCSV(csv)
  let years = []
  findYears.forEach(missiles => {
    years.push(missiles[5])
  })
  const og = data.data.data

  const minYear = d3.min(years)
  const maxYear = d3.max(years)

  // Define the div for the tooltip
  let tooltip = d3.select("#tooltip")
    .style("opacity", 0)
    .style("position", 'absolute');

  let y_scale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([margin.top, height])

  let y_axis = d3.axisLeft()
    .scale(y_scale)
    .tickFormat(d3.format('d'))

  y_axis.tickSize(-2000)

  const tree = d3.tree()
    .size([width, height])
    .separation(function (a, b) {
      return (a.parent == b.parent ? .5 : 1)
    })

  // nodes.forEach(function (d) { d.y = d.depth * 180; })
  const svg = d3.select('body')
    .append('svg')
    .attr('width', fullWidth)
    .attr('height', fullHeight)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  g.append('g')
    .call(y_axis)

  g.selectAll(".tick text")
    .attr('font-size', '20')
    .attr("transform", `translate(${margin.left + 50},${0})`)

  const elbow = (d, i) => {
    yPosTarget = y_scale(d.target.data.data.year)
    yPosSource = y_scale(d.source.data.data.year)
    // -------------- Refactor --------------
    if (d.source.data.data === og && d.target.children) {
      return `M${d.source.x},${(yPosSource + yOffset)}H${d.target.x},V${(yPosTarget)}`
    } else if (d.source.data.data === og && !d.target.children) {
      return `M${d.source.x},${(yPosSource + yOffset)}H${d.target.x},V${(yPosTarget)}`
    } else if (d.source.children && d.target.children) {
      return `M${d.source.x},${(yPosSource + yOffset)}H${d.target.x},V${(yPosTarget)}`
    } else {
      return `M${d.source.x},${(yPosSource + yOffset)}H${d.target.x},V${(yPosTarget)}`
    }
  }

  let linkPath = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => y_scale(d.data.data.year))

  let treeNodes = tree(data)
  let nodes = treeNodes.leaves(data)


  // treeNodes.count()
  //   .sort((a, b) => {
  //     return a.value - b.value
  //   })
  // console.log(treeNodes)

  const link = g.selectAll('.link')
    .data(treeNodes.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr("fill", "none")
    .attr("stroke", d => {
      let target = d.target.data.id.split(",")
      let parent = d.target.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return devColor
      } else {
        return acqColor
      }
    })
    .attr("stroke-width", d => {
      let target = d.target.data.id.split(",")
      let parent = d.target.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return 3
      }
    })
    .attr("d", elbow)
    .style('stroke-dasharray', d => {
      if (d.target.data.data.inherited) {
        return ('10.3')
      }
    })

  const node = g.selectAll('.node')
    .data(treeNodes.descendants())
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => {
      yPos = y_scale(d.data.data.year)
      // -------------- Refactor --------------
      if (d.data.data === og) {
        return "translate(" + d.x + "," + (yPos) + ")"
      } else if (d.children) {
        return "translate(" + d.x + "," + (yPos) + ")"
      } else {
        return "translate(" + d.x + "," + (yPos) + ")"
      }
    })

  let rects = node.append('rect')
    .attr("width", 100)
    .attr("height", 54)
    .attr('x', -50)
    .attr('y', -9)
    .style('fill', d => {
      let target = d.data.data.name.split(",")
      let parent = d.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return devColor
      } else {
        return acqColor
      }
    })
    .style("stroke", d => {
      let target = d.data.data.name.split(",")
      let parent = d.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return devColor
      } else {
        return acqColor
      }
    })

  function onMouseEnter(data) {
    console.log(data.data.data)
    let missile = data.data.data
    let missileInfo = missile.name.split(',')
    // let country = missileInfo[0]
    let name = missileInfo[1]
    // let parentInfo = missile.parent.split(',')
    // let parentCountry = parentInfo[0]
    // let parentName = parentInfo[1]
    let method = ""

    tooltip.transition()
      .duration(200)
      .style("opacity", .9)
      .style('left', (d3.event.pageX) + "px")
      .style('top', (d3.event.pageY - 58) + "px")

    tooltip.select(".tooltip-name")
      .text(name)

    if (!missile.parent) {
      method = "Created"
    } else if (missile.method === "Development") {
      method = "Developed"
    } else if (missile.method === "Rename") {
      method = "Renamed"
    } else {
      method = "Acquired"
    }

    tooltip.select("#method")
      .text(method)

    tooltip.select("#year")
      .text(missile.year)

    tooltip.select('.tooltip-annotation')
      .text(missile.annotation)
  }

  function onMouseOut(d) {
    tooltip.transition()
      .duration(500)
      .style("opacity", 0)
  }

  rects.on("mouseenter", onMouseEnter)
    .on("mouseout", onMouseOut)


  node.append('svg:image')
    .attr("xlink:href", 'ghadr.svg')
    .attr('class', 'missile-image')
    .attr("width", 100)
    .attr("height", 100)
    .attr('x', -50)
    .attr('y', -50)

  node.append('text')
    // .attr('x', d => {
    //   if (!d.children) {
    //     return xOffset
    //   }
    // })
    .attr('y', 20)

    .attr('text-anchor', 'middle')
    .text(d => `${d.data.id.split(",")[0]} `)
    .attr('class', 'missile-text missile-owner')

  node.append('text')
    // .attr('x', d => {
    //   if (!d.children) {
    //     return xOffset
    //   }
    // })
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .text(d => `${d.data.id.split(",")[1]} `)
    .attr('class', 'missile-text missile-name')
}
function fetchCSV(src) {
  return d3.csv(src, d => {
    let dataArrays = Object.values(d)
    return dataArrays
  })
}

createTree()