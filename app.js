// let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'
let csv = './data.csv'

const margin = { top: 40, right: 40, bottom: 140, left: 40 }
const fullWidth = 1700
const fullHeight = 3000
const width = fullWidth - margin.left - margin.right
const height = fullHeight - margin.top - margin.bottom
const yOffset = 45
const xOffset = 10
const devColor = "#F2C261"
const acqColor = '#5F7981'
const types = []
const typeColors = [
  '#5F7981',
  "#F2C261",
  '#07344A',
  '#4A2C07',
  '#076796'
]
let typeObj = []
let obj = {}



async function parseData(csv) {
  nodes = await fetchCSV(csv).then(res => {
    let child = []
    let parent = []
    let relationship = []
    res.forEach(missiles => {

      // // Create child missile name
      let childMissile = missiles[0] + ',' + missiles[3]

      let [country, inherited, method, missile, derivative, year, inPossession, type, url, annotation, icon] = missiles

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
        inherited,
        year,
        inPossession,
        type,
        url,
        annotation,
        method,
        icon
      })

      if (!types.includes(type)) {
        types.push(type)
      }

      types.forEach((type, i) => {
        let typeVal = typeColors[i]
        obj[type] = typeVal
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
  let tooltip = document.getElementById('tooltip')

  tippy.setDefaultProps({
    animation: 'fade',
    hideOnClick: true,
    interactive: true,
    onMount(tip) {
      let close = document.querySelector('.tooltip-close')

      if (!close) return
      close.addEventListener('click', () => {
        tip.hide()
      })
    }
  })

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
    .attr('role', 'presentation')

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

  const link = g.selectAll('.link')
    .data(treeNodes.links())
    .enter().append('path')
    .attr('class', 'link')
    // .attr('id', d => {
    //   return ("link" + d.source.data.id + "-" + d.target.data.id)
    // })
    .attr("fill", "none")
    .attr("stroke", '#07344A')
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
    .attr("width", 200)
    .attr("height", 54)
    .attr('x', -100)
    .attr('y', -9)
    .attr('class', 'tippyTips')
    // .attr('id', d => {
    //   return 'node' + d.data.id
    // })
    .style('fill', d => {
      let type = d.data.data.type
      return obj[type]
    })

  if (!SVGElement.prototype.contains) {
    SVGElement.prototype.contains = HTMLDivElement.prototype.contains;
  }

  let tooltipInstance

  function onMouseover(data) {
    console.log(data)
    let missile = data.data.data
    let missileInfo = missile.name.split(',')
    // let country = missileInfo[0]
    let name = missileInfo[1]
    // let parentInfo = missile.parent.split(',')
    // let parentCountry = parentInfo[0]
    // let parentName = parentInfo[1]
    let method = ""

    if (!missile.parent) {
      method = "Created"
    } else if (missile.method === "Development") {
      method = "Developed"
    } else if (missile.method === "Rename") {
      method = "Renamed"
    } else {
      method = "Acquired"
    }

    const container = document.createElement('div')
    container.setAttribute("id", "parent")

    tooltip.content.querySelector('.tooltip__heading').innerHTML = name
    tooltip.content.querySelector('.tooltip__method').innerHTML = method
    tooltip.content.querySelector('.tooltip__year').innerHTML = missile.year
    tooltip.content.querySelector('.tooltip__annotation').innerHTML = missile.annotation


    const node = document.importNode(tooltip.content, true)
    // Accessibility
    tooltip.setAttribute("aria-expanded", true)

    container.appendChild(node)

    tooltipInstance = tippy(this, {
      content: container.innerHTML,
      appendTo: document.body
      // popperOptions: {
      //   positionFixed: true
      // }
    })

    // rects.style('fill', 'white')
    // link.style('stroke', "#c3c3c3")
    // while (data.parent) {
    //   d3.selectAll('#node' + data.parent.id).style('fill', 'red')
    //   if (data.parent != 'null') {
    //     d3.selectAll("#link" + data.parent.id + "-" + data.data.id).style("stroke", 'red')
    //     data = data.data.parent
    //   }
    // }
  }

  function onMouseLeave(d) {
    tooltip.setAttribute("aria-expanded", false)
  }

  rects.on("mouseover", onMouseover)
    .on("mouseleave", onMouseLeave)

  node.append("use")
    .attr("xlink:href", d => {
      let icon = d.data.data.icon
      return `./missiles/symbol-defs.svg#icon-${icon}`
    })
    .attr("width", 200)
    .attr('class', 'missile-image')
    .attr("height", 200)
    .attr('x', -100)
    .attr('y', -85)


  node.append('text')
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