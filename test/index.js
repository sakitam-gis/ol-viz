/* eslint-env es6 */
const SMap = require('../dist/ol-viz')
describe('Class', () => {
  it('export', () => {
    const A = new SMap(1000)
    const B = A.getValue()
    expect(A).to.eql(B)
  })
})
