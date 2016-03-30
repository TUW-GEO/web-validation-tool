'''
Created on May 16, 2013

@author: Christoph Paulik christoph.paulik@geo.tuwien.ac.at
'''
import tornado.httpserver
import tornado.websocket
import tornado.ioloop
import tornado.web
import base64
import numpy as np
from numpy import ma
from datetime import datetime
import json

import geo_python.RS.Validation.web.plots as rs_plots
import geo_python.RS.Validation.web.data_request as rs_data
import geo_python.general.grid.dgg.find as find_gp
import geo_python.RS.dataspecific.ECMWF.grid as era_grid

from matplotlib import _png
from matplotlib import backend_bases

import cStringIO

png_buffer = cStringIO.StringIO()


class WSHandler(tornado.websocket.WebSocketHandler):
    """
    This class does nothing at the moment, it was created to test the usage of websockets

    """
    messages = []

    def open(self):
        print 'new connection'
        self.write_message("Hello World")

    def on_message(self, message):
        try:
            data = json.loads(message)
        except ValueError:
            pass
        print 'message received %s' % message
        print self.messages
        self.messages.append(message)
        test = np.arange(100, dtype=np.float64)
        send = base64.b64encode(json.dumps(test.tolist()))
        # self.write_message(json.dumps(test.tolist()))

        if message == 'plot':
            fig = rs_plots.plot_ascat_data(1373)
            fig.canvas.draw()
            renderer = fig.canvas.get_renderer()
            buffer = np.array(
                np.frombuffer(renderer.buffer_rgba(0, 0), dtype=np.uint32),
                copy=True)
            buffer = buffer.reshape((renderer.height, renderer.width))
            output = buffer
            png_buffer.reset()
            png_buffer.truncate()
            # global_timer()
            _png.write_png(output.tostring(),
                           output.shape[1], output.shape[0],
                           png_buffer)
            # print global_timer
            datauri = "data:image/png;base64,{0}".format(
                png_buffer.getvalue().encode("base64").replace("\n", ""))
            self.write_message(datauri)

    def on_close(self):
        print 'connection closed'


class DataHandler(tornado.web.RequestHandler):
    """
    upon get request serves data to the validation tool
    """

    def get(self):
        """
        handles the get request, which should containt the arguments listes under
        parameters

        Parameters
        ----------
        station_id: int
            id of station in database
        scaling: string
            chosen scaling method , for available choices see general.times_eries.scaling
        snow_depth: float
            mask snow depth greater than this value
        st_l1: float
            mask surface temperature layer1 lower than this value
        air_temp: float
            mask 2m air temperature lower than this value
        ssf_masking: boolean
            use SSF for masking true or false    
        """
        station_id = int(self.get_argument('station_id'))
        scaling = self.get_argument('scaling')
        snow_depth = self.get_argument('snow_depth')
        st_l1 = self.get_argument('st_l1')
        air_temp = self.get_argument('air_temp')
        ssf_masking = self.get_argument('ssf_masking')
        ssf_dict = {'true': True, 'false': False}

        anomaly = self.get_argument('anomaly')
        if anomaly == 'none':
            anomaly = None

        data, status = rs_data.get_data(station_id, scaling,
                                        mask={'snow_depth': float(snow_depth), 'st_l1': float(st_l1), 'air_temp': float(air_temp), 'use_ssf': ssf_dict[ssf_masking]}, anomaly=anomaly)
        if status == -1:
            self.write('Error')
        else:
            self.write(data)
            self.set_header("Access-Control-Allow-Origin", "*")


class OptionsHandler(tornado.web.RequestHandler):
    """
    For loading options in the client    
    """

    def get(self):
        """
        sends available scaling options to client
        """

        scaling_options = {'noscale': 'No scaling',
                           'porosity': 'Scale using porosity',
                           'linreg': 'Linear Regression',
                           'mean_std': 'Mean - standard deviation',
                           'min_max': 'Minimum,maximum',
                           'lin_cdf_match': 'Piecewise linear CDF matching',
                           'cdf_match': 'CDF matching'}

        self.write({'scaling': scaling_options})
        self.set_header("Access-Control-Allow-Origin", "*")


class LatLonHandler(tornado.web.RequestHandler):
    """
    loads nearest points
    """

    def get(self):
        """
        returns nearest era interim and ascat grid points for given
        lat lon

        Parameters
        ----------
        lat: float
            latitude of point
        lon: float
            longitude of point
        """
        lat = float(self.get_argument('lat'))
        lon = float(self.get_argument('lon'))

        era_gpi, era_dist, era_lat, era_lon, era_status = era_grid.find_nearest_gp(
            lat, lon)
        warp_gpi, warp_dist, warp_lat, warp_lon, warp_status = find_gp.find_nearest_gp(
            lat, lon, "warp_grid", lm_name='ind_ld')

        self.write({'warp': {'gpi': warp_gpi[0], 'distance': '%.1f m' % warp_dist[0], 'lat': warp_lat[0], 'lon': warp_lon[0]},
                    'era': {'gpi': era_gpi, 'distance': '%.1f m' % era_dist, 'lat': era_lat, 'lon': era_lon}})
        self.set_header("Access-Control-Allow-Origin", "*")

application = tornado.web.Application([
    (r'/cdi/ws', WSHandler),
    (r'/cdi/getdata', DataHandler),
    (r'/cdi/getoptions', OptionsHandler),
    (r'/cdi/getlatlon', LatLonHandler),
])


if __name__ == "__main__":
    http_server = tornado.httpserver.HTTPServer(application)
    port = 80
    http_server.listen(port)
    print 'Running on port %d' % port
    tornado.ioloop.IOLoop.instance().start()
