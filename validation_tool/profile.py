#!flask/bin/python
from werkzeug.contrib.profiler import ProfilerMiddleware
from validation_tool import app

app.config['PROFILE'] = True
app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions=[30],
                                  sort_by=('tottime', 'calls'))
app.run(debug=True)
