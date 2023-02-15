from os import environ
from redis import Redis, exceptions
import string
import random

def connect_to_redis():
    hostname = environ.get('REDIS_HOSTNAME', 'localhost')
    port = environ.get('REDIS_PORT', 6379)

    r = Redis(hostname, port, retry_on_timeout=True)
    return r

def ensure_group_exists(redis_connection):
    try:
        redis_connection.xgroup_create('stream:captcha-solve:requested', 'captcha-solver', mkstream=True)
    except exceptions.ResponseError as e:
        print(e)
def get_data(redis_connection):
    # last_id = 0
    sleep_ms = 100
    while True:
        try:
            resp = redis_connection.xreadgroup(
                'captcha-solver',
                ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(5)),
                {'stream:captcha-solve:requested': '>'}, count=1, block=sleep_ms
            )
            if resp:
                key, messages = resp[0]
                last_id, data = messages[0]
                print('REDIS ID: ', last_id)
                send_data(redis_connection)

        except ConnectionError as e:
            print('ERROR REDIS CONNECTION: {}'.format(e))


def send_data(redis_connection):
    try:
        resp = redis_connection.xadd('stream:captcha-solve:resolved', {'solved': '1234'})
        print(resp)

    except ConnectionError as e:
        print("ERROR REDIS CONNECTION: {}".format(e))


if __name__ == '__main__':
    connection = connect_to_redis()
    ensure_group_exists(connection)
    get_data(connection)