let csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLJIlrB1oAyaQXY6jAlsinmptuHZClR-d8kOzXbv9xSLyTYl-jFGmt92wmAvQ9qq64Ewps-tHAeaO/pub?gid=1716883814&single=true&output=csv'


// let data = d3.csv(csv).then(function (data) {
//   console.log(data)
//   return data
// })

const margin = { top: 10, right: 10, bottom: 10, left: 10 }
const fullWidth = 960
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
      // 
      relationship.push({ 'name': childMissile, 'parent': parentMissile })
    })
    let stratify = d3.stratify()
      .id(function (d) { return d.name })
      .parentId(function (d) { return d.parent })
    let root = stratify(relationship)
    return root
  })
  return d3.hierarchy(nodes)
}

async function createTree() {


  let data = await parseData(csv)


  const tree = d3.tree(data)
    .separation((a, b) => ((a.parent === b.parent) ? 1 : 0.5))
    .size([height, width])

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
    return `M${d.source.y},${d.source.x}H${d.target.y},V${d.target.x}${d.target.children ? '' : 'h' + margin.right}`
  }


  let treeNodes = tree(data)

  console.log(treeNodes)

  const link = g.selectAll('.link')
    .data(treeNodes.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('d', elbow)

  const node = g.selectAll('.node')
    .data(treeNodes.descendants())
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`)

  node.append('text')
    .attr('class', 'name')
    .attr('x', 8)
    .attr('y', -6)
    .text(d => {
      console.log(d)
      return `${d.data.id}`
    })

}
function fetchCSV(src) {
  return d3.csv(src, d => {
    let dataArrays = Object.values(d)
    return dataArrays
  })
}

createTree()