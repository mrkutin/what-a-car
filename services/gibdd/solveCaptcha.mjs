const CAPTCHA_SOLVER_URL = process.env.CAPTCHA_SOLVER_URL || 'http://0.0.0.0:8080'

//solve captcha
import axios from 'axios'

const solveCaptcha = async base64jpg => {
    const solveCaptchaRes = await axios.post(`${CAPTCHA_SOLVER_URL}/solve`, base64jpg)
    if(!solveCaptchaRes.data){
        throw new Error('could not solve captcha')
    }
    return {captchaWord: solveCaptchaRes.data}
}

export {solveCaptcha}