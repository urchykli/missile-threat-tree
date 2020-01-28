// let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'
let csv = './data.csv'

// let data = d3.csv(csv).then(function (data) {
//   console.log(data)
//   return data
// })

const margin = { top: 40, right: 10, bottom: 10, left: 10 }
const fullWidth = 1500
const fullHeight = 1000
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

      relationship.push({ 'name': childMissile, 'parent': parentMissile, 'year': missiles[5], 'inPossession': missiles[6], 'range': missiles[7], 'url': missiles[8], 'annotation': missiles[9] })
    })
    let stratify = d3.stratify()
      .id(function (d) { return d.name })
      .parentId(function (d) { return d.parent })
    let root = stratify(relationship)
    return root
  })
  return d3.hierarchy(nodes)
}

// async function yearsArray() {
//   let years = await fetchCSV(csv)
// }

async function createTree() {

  let data = await parseData(csv)
  let findYears = await fetchCSV(csv)
  let years = []
  findYears.forEach(missiles => {
    years.push(missiles[5])
  })


  let minYear = d3.min(years)
  let maxYear = d3.max(years)

  let y_scale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([margin.top, height])

  let y_axis = d3.axisLeft()
    .scale(y_scale)

  const tree = d3.tree(data)
    .size([width, height])

  const svg = d3.select('body')
    .append('svg')
    .attr('width', fullWidth)
    .attr('height', fullHeight)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  // .call(y_axis)

  g.append('text')
    .text('d3.tree - A Family Tree')
    .attr('class', 'title')
    .attr('x', 50)
    .attr('y', 50)

  const elbow = (d, i) => {
    console.log(d.source)
    return `M${d.source.x},${y_scale(d.source.data.data.year)}H${d.target.x},V${y_scale(d.target.data.data.year)}${d.target.children ? '' : 'h' + margin.right}`
  }

  let treeNodes = tree(data)

  const link = g.selectAll('.link')
    .data(treeNodes.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('d', elbow)


  const node = g.selectAll('.node')
    .data(treeNodes.descendants())
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => {
      console.log(d.data.data.year)
      return "translate(" + d.x + "," + y_scale(d.data.data.year) + ")"
    })

  node.append('text')
    .attr('x', 8)
    .attr('y', -6)
    .text(d => `${d.data.id.split(",")[0]}`)
    .attr('class', 'text')
}
function fetchCSV(src) {
  return d3.csv(src, d => {
    let dataArrays = Object.values(d)
    return dataArrays
  })
}

createTree()