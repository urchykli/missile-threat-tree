let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'


// let data = d3.csv(csv).then(function (data) {
//   console.log(data)
//   return data
// })

const margin = { top: 40, right: 10, bottom: 10, left: 10 }
const fullWidth = 1500
const fullHeight = 500
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
      console.log(relationship)
    })
    let stratify = d3.stratify()
      .id(function (d) { return d.name })
      .parentId(function (d) { return d.parent })
    let root = stratify(relationship)
    console.log(root)
    return root
  })
  return d3.hierarchy(nodes)
}


async function createTree() {

  let data = await parseData(csv)
  let format_name = data.data.data.name.split(",")

  const tree = d3.tree(data)
    .separation((a, b) => ((a.parent === b.parent) ? 150 : 50))
    .size([width, height])

  const svg = d3.select('body')
    .append('svg')
    .attr('width', fullWidth)
    .attr('height', fullHeight)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  g.append('text')
    .text('d3.tree - A Family Tree')
    .attr('class', 'title')
    .attr('x', 50)
    .attr('y', 50)

  const elbow = (d, i) => {
    return `M${d.source.x},${d.source.y}H${d.target.x},V${d.target.y}${d.target.children ? '' : 'h' + margin.right}`
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
    .attr('transform', d => `translate(${d.x},${d.y})`)

  node.append('text')
    .attr('class', 'name')
    .attr('x', 8)
    .attr('y', -6)
    .text(d => `${d.data.id.split(",")[0]}`)

}
function fetchCSV(src) {
  return d3.csv(src, d => {
    let dataArrays = Object.values(d)
    return dataArrays
  })
}

createTree()