// let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'
let csv = './data.csv'

const margin = { top: 40, right: 20, bottom: 40, left: 20 }
const fullWidth = 1700
const fullHeight = 2000
const width = fullWidth - margin.left - margin.right
const height = fullHeight - margin.top - margin.bottom

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
      let parentMissile = ""
      // Determine if this is the root missile
      if (!missiles[2]) {
        // If root missile, add empty string to parentMissile
        parentMissile = ""
      } else {
        // If not root missile, create parent missile name
        parentMissile = missiles[2] + ',' + getDerivative(missiles[4])
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
        'annotation': missiles[9]
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

  const minYear = d3.min(years)
  const maxYear = d3.max(years)

  let y_scale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([margin.top, height])

  let y_axis = d3.axisLeft()
    .scale(y_scale)

  y_axis.tickSize(-2000)


  const tree = d3.tree(data)
    .size([width, height])
    .separation(function (a, b) {
      // console.log(a.parent, b.parent)
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

  // const elbow = (d, i) => {
  //   return `M${d.target.x}, ${y_scale(d.target.data.data.year)} C${(d.target.x + d.source.x) / 2},${y_scale(d.target.data.data.year)} ${(d.target.x + d.source.x) / 2},${y_scale(d.source.data.data.year)} ${d.source.x},${y_scale(d.source.data.data.year)}`
  // }

  let linkPath = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => y_scale(d.data.data.year))

  let treeNodes = tree(data)
  let nodes = treeNodes.leaves(data)

  console.log(nodes)

  const link = g.selectAll('.link')
    .data(treeNodes.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr("fill", "none")
    .attr("stroke", d => {
      let target = d.target.data.id.split(",")
      let parent = d.target.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return "#E68A50"
      } else {
        return "#179699"
      }
    })
    .attr("stroke-width", d => {
      let target = d.target.data.id.split(",")
      let parent = d.target.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return 3
      }
    })
    .attr("d", linkPath)
    .style('stroke-dasharray', d => {
      if (d.target.data.data.inherited) {
        return ('10.3')
      }
    })

  const node = g.selectAll('.node')
    .data(treeNodes.descendants())
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => "translate(" + d.x + "," + y_scale(d.data.data.year) + ")")

  node.append("circle")
    .attr("r", 5)
    .style("stroke", d => {
      let target = d.data.data.name.split(",")
      let parent = d.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return "#E68A50"
      } else {
        return "#179699"
      }
    })
    .style('stroke-width', d => {
      let target = d.data.data.name.split(",")
      let parent = d.data.data.parent.split(',')
      if (parent[0] === target[0]) {
        return 3
      }
    })
    .style('fill', '#179699')
  // .style("stroke", d => d.data.type)
  // .style("fill", d => d.data.level)

  node.append('text')
    // .attr('x', 0)
    .attr('y', 25)
    .attr('text-anchor', 'middle')
    .text(d => `${d.data.id.split(",")[0]} `)
    .attr('class', 'text')

  node.append('text')
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .text(d => `${d.data.id.split(",")[1]} `)
    .attr('class', 'text')
}
function fetchCSV(src) {
  return d3.csv(src, d => {
    let dataArrays = Object.values(d)
    return dataArrays
  })
}

createTree()