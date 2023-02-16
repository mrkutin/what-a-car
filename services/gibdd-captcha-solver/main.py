from os import environ
from redis import Redis, exceptions
import string
import random
from solve_captcha import solve_base64

hostname = environ.get('REDIS_HOSTNAME', 'localhost')
port = environ.get('REDIS_PORT', 6379)
heartbeat_interval = 100


def ensure_group_exists(redis_connection):
    try:
        redis_connection.xgroup_create('stream:captcha:requested', 'captcha-solver', mkstream=True)
    except exceptions.ResponseError as e:
        print(e)


def get_data(redis_connection):
    while True:
        try:
            resp = redis_connection.xreadgroup(
                'captcha-solver',
                ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(5)),
                {'stream:captcha:requested': '>'}, count=1, block=heartbeat_interval
            )
            if resp:
                stream, messages = resp[0]
                last_id, data = messages[0]

                token = str.encode(data[b'key'].decode('utf8').split(':')[1])
                base64 = redis_connection.get(data[b'key'])
                solution = solve_base64(base64)

                output_data = data.copy()
                output_data[b'token'] = token
                output_data[b'solution'] = solution
                del output_data[b'key']

                redis_connection.xadd('stream:captcha:resolved', output_data)
        except exceptions.ResponseError as e:
            print(e)


if __name__ == '__main__':
    connection = Redis(hostname, port, retry_on_timeout=True)
    ensure_group_exists(connection)
    get_data(connection)
