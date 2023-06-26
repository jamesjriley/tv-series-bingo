from imdb import IMDb
from flask import Flask, render_template, request

import json

app = Flask(__name__, static_folder='client/build', static_url_path='/')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api')
def get_data():
    return {'message': 'Hello, world!'}

@app.route('/api/events', methods=['GET'])
def get_events():
    show_name = request.args.get('showName', default = '', type = str)
    with open('events.json', 'r') as f:
        events = json.load(f)
    return events

@app.route('/api/showinfo', methods=['GET'])
def get_show_info():
    show_name = request.args.get('showName', default = '', type = str)
    ia = IMDb()
    movies = ia.search_movie(show_name)
    if movies:
        movie = movies[0]  # Get the first movie that matches the search
        ia.update(movie)  # Update movie with more detailed info
        plot = movie.data.get('plot', ["No plot available."])
        title = movie.data.get('title', "No title available.")
        year = movie.data.get('year', "No year available.")
        url = ia.get_imdbURL(movie)
        result = {"showName": show_name, "plot": plot, "title": title, "year": year, "url": url}
    else:
        result = {"showName": show_name, "plot": "No show found.", "title": "", "year": "", "url": ""}
    return result



if __name__ == '__main__':
    app.run(debug=True)
