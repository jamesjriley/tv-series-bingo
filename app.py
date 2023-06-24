from flask import Flask, render_template

app = Flask(__name__, static_folder='client/build', static_url_path='/')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api')
def get_data():
    return {'message': 'Hello, world!'}

if __name__ == '__main__':
    app.run(debug=True)
