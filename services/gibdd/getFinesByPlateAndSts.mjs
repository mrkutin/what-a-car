import axios from 'axios'
import UserAgent from 'user-agents'
import {getCaptcha} from './getCaptcha.mjs'
import {solveCaptcha} from './solveCaptcha.mjs'

const getFinesByPlateAndSts = async (plate, sts) => {
    let regnum, regreg
    if (plate.match(/^[АВЕКМНОРСТУХ]\d{3}(?<!000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) ) {//обычный номер
        regnum = plate.substr(0, 6)
        regreg = plate.substr(6)
    } else {
        return null
    }
    const makeRequest = async () => {
        const {captchaToken, base64jpg} = await getCaptcha()
        const {captchaWord} = await solveCaptcha(base64jpg)
        const userAgentData = new UserAgent().data

        const res = await axios.post('https://xn--b1afk4ade.xn--90adear.xn--p1ai/proxy/check/fines', {
            regnum,
            regreg,
            stsnum: sts,
            captchaWord,
            captchaToken
        }, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
                'Cache-Control': 'no-api-gateway',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'xn--b1afk4ade.xn--90adear.xn--p1ai',
                'Origin': 'https://xn--90adear.xn--p1ai',
                'Pragma': 'no-api-gateway',
                'Referer': 'https://xn--90adear.xn--p1ai/',
                //'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
                'sec-ch-ua-mobile': `?${userAgentData.deviceCategory === 'desktop' ? '0' : '1'}`,
                'sec-ch-ua-platform': userAgentData.platform,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': userAgentData.userAgent
            }
        })

        if (!res?.data?.data) {
            return null
        }

        const {data: fines, divisions} = res.data

        const result = fines.map(fine => {
            return {...fine, division: divisions[fine.Division]}
        })

        return result
    }

    let res
    try {
        res = await makeRequest()
        if (!res) {
            res = await makeRequest()
        }
    } catch (e) {
        console.log(e.message)
    }
    return res
}

// const fines = await getFinesByPlateAndSts('т617ам790', '9923843432')
// const fines = await getFinesByPlateAndSts('Т275АТ797', '9918388772')
// console.log(JSON.stringify(fines, null, 2))

export {getFinesByPlateAndSts}