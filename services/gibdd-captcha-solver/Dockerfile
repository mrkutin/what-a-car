FROM tensorflow/tensorflow
RUN apt-get update && apt-get install -y python3-opencv
WORKDIR /usr/src/app
COPY ./requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt
COPY ./*.py ./
COPY ./numeric_captcha_model.hdf5 .
# CMD uvicorn main:app --host 0.0.0.0 --port 8080
CMD python main.py