import axios from 'axios'
import * as cheerio from 'cheerio'
import headers from './headers.mjs'

const getProcessedInsurance = async processId => {
    try {
        const res = await axios.post(`https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfoData.htm`, `processId=${processId}`)
        const $ = await cheerio.load(res.data, {
            xml: {
                xmlMode: true,
                withStartIndices: true,
            }
        })
        const texts = $('tr.data-row > td').toArray().map(el => $(el).text())
        const fifthLineArray = texts[5].split('\r\n').map(el => el.trim())

        texts.splice(5, 1, fifthLineArray[7], fifthLineArray[12], fifthLineArray[16], fifthLineArray[26])
        const autoins = texts.reduce((acc, text, idx) => {
            acc[headers[idx]] = text
            return acc
        }, {})
        return Promise.resolve(autoins)
    } catch (err) {
        return Promise.reject(err.message)
    }
}

// const res = getProcessedInsurance(1534614576)
// console.log(res)

export {getProcessedInsurance}
