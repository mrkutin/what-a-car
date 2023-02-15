const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859'// STATIC!!!

import axios from 'axios'
import UserAgent from 'user-agents'
import {SocksProxyAgent} from 'socks-proxy-agent'
const httpsAgent = new SocksProxyAgent(PROXY)
const userAgentData = new UserAgent().data

const getCaptcha = async () => {
    const getCaptchaRes = await axios.get('https://check.gibdd.ru/captcha', {
        httpsAgent,
        headers: {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
            'Cache-Control': 'no-api-gateway',
            'Connection': 'keep-alive',
            'Host': 'check.gibdd.ru',
            'Origin': 'https://xn--90adear.xn--p1ai',
            'Pragma': 'no-api-gateway',
            'Referer': 'https://xn--90adear.xn--p1ai/', //'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
            'sec-ch-ua-mobile': `?${userAgentData.deviceCategory === 'desktop' ? '0' : '1'}`,
            'sec-ch-ua-platform': userAgentData.platform,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': userAgentData.userAgent
        }
    })
    if (!getCaptchaRes.data) {
        throw new Error('could not get captcha')
    }
    const {token: captchaToken, base64jpg} = getCaptchaRes.data
    return {captchaToken, base64jpg}
}
getCaptcha()
export {getCaptcha}

