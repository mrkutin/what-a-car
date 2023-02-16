from fastapi import Request, FastAPI, HTTPException
import uvicorn
from solve_captcha import solve_base64
import os

app = FastAPI()


@app.get('/')
async def read_root():
    return 'gibdd-captcha-solver'


@app.post('/solve')
async def read_root(request: Request):
    body = await request.body()
    solution = solve_base64(body)
    return solution

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8080)