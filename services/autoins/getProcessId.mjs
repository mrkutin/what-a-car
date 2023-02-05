import querystring from 'node:querystring'
import moment from 'moment'

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    defaultViewport: {
        width: 1920, height: 1080
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
    //args: [ '--proxy-server=http://80.244.229.102:10000' ]
})

const page = await browser.newPage()
const cookies = [
    {name: '_ym_d', value: '1674402333', domain: '.autoins.ru'},
    {name: '_ym_isad', value: '2', domain: '.autoins.ru'},
    {name: '_ym_uid', value: '1674402333885302806', domain: '.autoins.ru'},
    {name: 'JSESSIONID', value: 'B47E6AAB149D3251D704AEAF12A45F53', domain: 'dkbm-web.autoins.ru'}
]

await page.setCookie(...cookies)
await page.goto('https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfo.htm')

await page.waitForSelector('#tsBlockTab', {timeout: 5000})
await page.click('#tsBlockTab')

const getProcessId = async plate => {
    // await page.evaluate((plate) => {
    //     const licensePlate = document.querySelector('#licensePlate')
    //     licensePlate.value = plate
    // }, plate)
    const encodedPlate = querystring.encode({licensePlate: plate})
    const todayFormatted = moment().format('DD.MM.YYYY')

    await page.evaluate(`getRecaptchaToken("6LcWXc8gAAAAAMpgB0-7TzTELlr8f7T2XiTrexO5", function (token) {
            var formData = getFormDataParams(token);
            var formData = "bsoseries=%D0%A1%D0%A1%D0%A1&bsonumber=&requestDate=${todayFormatted}&vin=&${encodedPlate}&bodyNumber=&chassisNumber=&isBsoRequest=false&&captcha=" + token;
            $.ajax({
                type: "post",
                cache: false,
                url: "policyInfo.htm",
                data: formData,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Accept", "application/json");
                },
                success: function (data) {
                    if (!data.validCaptcha) {
                        LoadingImage.hide();
                        showError(data.errorMessage);
                        return;
                    } else if (data.invalidFields && data.invalidFields.length > 0) {
                        LoadingImage.hide();
                        showErrors(null, data.invalidFields);
                        return;
                    }
                    if (data.errorMessage && data.errorMessage !== "") {
                        LoadingImage.hide();
                        showError(data.errorMessage);
                        return;
                    }
                    $("#processId").val(data.processId);
                    console.log("from evaluate - processId=", data.processId);
                    return;
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    LoadingImage.hide();
                    resetCaptch();
                    if (jqXHR.status === '504') {
                        showError("Превышено время ожидания ответа от сервера очередей сообщений");
                    } else {
                        showError("Произошла непредвиденная ошибка. Попробуйте еще раз.");
                    }
                }
            });
        }, function (err) {
            console.log(err)
        })`
    )
    await page.waitForTimeout(1000)//todo 500?
    const processIdElement = await page.$('#processId')
    const processId = await page.evaluate(el => el.value, processIdElement)
    return processId
}

export {getProcessId}