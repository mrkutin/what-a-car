const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859' // STATIC!!!

import axios from 'axios'

import * as cheerio from 'cheerio'
import {headersVin, headersVinBody, headersVinBodyChassis} from './headers.mjs'

import {SocksProxyAgent} from 'socks-proxy-agent'
const httpsAgent = new SocksProxyAgent(PROXY)

const split = (arr, size) => arr.reduce(
    (acc, e, i) => {
        i % size
            ? acc[acc.length - 1].push(e)
            : acc.push([e])
        return acc
    }, [])

const getProcessedInsurance = async (processId, cookies) => {
    try {
        const res = await axios.post(`https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfoData.htm`, `processId=${processId}`, {
            httpsAgent,
            headers: {
                Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';')
            }
        })
        const $ = await cheerio.load(res.data, {
            xml: {
                xmlMode: true,
                withStartIndices: true,
            }
        })
        const texts = $('tr.data-row > td').toArray().map(el => $(el).text())

        const output = []
        const chunks = split(texts, 15)
        for (const chunk of chunks){
            const fifthLineArray = chunk[5].split('\r\n').map(el => el.trim())
            let headers
            if(chunk[5].includes('VIN') && chunk[5].includes('Номер кузова') && chunk[5].includes('Номер шасси')){
                chunk.splice(5, 1,
                    fifthLineArray[7], //model
                    fifthLineArray[12], //plate
                    fifthLineArray[16], //vin
                    fifthLineArray[21], //chassis
                    fifthLineArray[27], //body
                    fifthLineArray[36]) //power
                headers = headersVinBodyChassis
            } else if (chunk[5].includes('VIN') && chunk[5].includes('Номер кузова')){
                chunk.splice(5, 1,
                    fifthLineArray[7], //model
                    fifthLineArray[12], //plate
                    fifthLineArray[16], //vin
                    fifthLineArray[22], //body
                    fifthLineArray[31]) //power
                headers = headersVinBody
            } else {
                //todo
                chunk.splice(5, 1,
                    fifthLineArray[7], //model
                    fifthLineArray[12], //plate
                    fifthLineArray[16], //vin
                    fifthLineArray[26]) //power
                headers = headersVin
            }

            const autoins = chunk.reduce((acc, text, idx) => {
                acc[headers[idx]] = text
                return acc
            }, {})

            output.push(autoins)
        }

        return Promise.resolve(output)
    } catch (err) {
        return Promise.reject(err.message)
    }
}

//const res = await getProcessedInsurance(1586055977)
// const res = await getProcessedInsurance(1586155195)
// console.log(res)

export {getProcessedInsurance}
