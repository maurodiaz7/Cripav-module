import ipywidgets as widgets
from traitlets import Unicode, List, Int, Dict, Float
from traitlets import observe

from scipy import stats 
from scipy.spatial import distance_matrix
from io import BytesIO
import pandas as pd
import numpy as np

from datetime import datetime, timedelta
import random
import string
import os
import umap
import hdbscan
import sys
import json
from PIL import Image

import requests
import base64

from . import arrangeopt
from . import image_download
from . import streetview
import pathlib

# See js/lib/example.js for the frontend counterpart to this file.

# widget classes

from json import JSONEncoder
class NumpyArrayEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return JSONEncoder.default(self, obj)

class geometricArrPlot(arrangeopt.geometricArrangement, arrangeopt.plotWindows):
    pass

@widgets.register
class Scatterplot(widgets.DOMWidget):
    """An example widget."""

    # Name of the widget view class in front-end
    _view_name = Unicode('ScatterplotView').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('ScatterplotModel').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('0.1.0').tag(sync=True)
    # Version of the front-end module containing widget model
    _model_module_version = Unicode('0.1.0').tag(sync=True)

    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.
    value = List([]).tag(sync=True)
    clicked_dot = Int(-1).tag(sync=True)

    clicked_value = {}

    def initialize(self, value):
        self.value = value[0:10]
        return self

    @observe('clicked_dot')
    def set_num_cluster(self, cluster_num):
        self.clicked_value = self.value[self.clicked_dot]
        return self


@widgets.register
class CriPAV4(widgets.DOMWidget):
    """An example widget."""

    # Name of the widget view class in front-end
    _view_name = Unicode('CriPAV4View').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('CriPAV4Model').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('0.1.0').tag(sync=True)
    # Version of the front-end module containing widget model
    _model_module_version = Unicode('0.1.0').tag(sync=True)
    
    # names
    _div_name = Unicode().tag(sync=True)
    
    # data attributes
    value = List([]).tag(sync=False) # all nodes info
    data_encoded = List([]).tag(sync=False) # all nodes encoded
    data_time_series = Dict({}).tag(sync=False) # time series for every cid
    data_cluster = List([]).tag(sync=True) # nodes + class after clustering
    data_cluster_mean = List([]).tag(sync=True) # class + cant + mean
    non_hotspots = List([]).tag(sync=True) # prob/int for non hotspots

    # full data ranges
    value_prob_range = List([]).tag(sync=True)
    value_int_range = List([]).tag(sync=True)
    fecha_inicio = Unicode().tag(sync=True)
    fecha_fin = Unicode().tag(sync=True)

    # for drawing map when selecting with lasso element
    selected_ids = List([]).tag(sync=True) # list ids from lasso selection
    selected_class = Int(-1).tag(sync=True) # id_selected_class
    current_selection = List([]).tag(sync=True) # values of selected_ids
    current_time_series = List([]).tag(sync=True) # time series for selected
    # calculated_hotspots = List([]).tag(sync=True)

    # attributes for bdscan and projection
    alpha_mf = Float(0).tag(sync=True) # Main filters: Alpha 0-1
    pct_mf = Int(0).tag(sync=True) # Main filters: Pct 0-100
    n_run = Int(-1).tag(sync=True) # we observe this helper variable to gen hotspots

    #static count vars
    total_crimes = Int(0).tag(sync=True)
    total_hotspots = Int(0).tag(sync=True)
    calculated_crimes = Int(0).tag(sync=True)
    calculated_hotspots = Int(0).tag(sync=True)

    #dynamic count vars (se calculan despues de seleccionar)
    selected_crimes = Int(0).tag(sync=True)
    selected_hotspots = Int(0).tag(sync=True)
    
    # vars for physical view
    clicked_dot = Int(-1).tag(sync=True)
    selected_hotspot_series = List([]).tag(sync=True)

    # file path
    _file_path = Unicode().tag(sync=True)
    current_images = List([]).tag(sync=True) # list images
    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.


    def initialize(self,value,data_encoded,data_time_series, fecha_inicio, fecha_fin, full_size=False):
        if full_size:
            from IPython.display import display, HTML
            display(HTML("<style>.container { width:100% !important; }</style>"))

        self._div_name = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        self.fecha_inicio = fecha_inicio
        self.fecha_fin = fecha_fin
        self.value = value
        probs = [x['prob'] for x in value]
        inte = [x['inte'] for x in value]
        self.value_prob_range = [min(probs), max(probs)]
        self.value_int_range = [min(inte), max(inte)]
        self.current_selection = []
        self.data_encoded = data_encoded
        self.data_time_series = dict()
        self.total_hotspots = len(value)
        temp_tc = 0
        for val in data_time_series:
            self.data_time_series[val[0]] = val[1:]
            temp_tc += int(sum(val[1:]))

        self.total_crimes = temp_tc
        self._file_path = os.getcwd()
        return self

    @observe('n_run')
    def calc_hotspots(self, value):
        encoded_columns = [str(i) for i in range(len(self.data_encoded[0])-1)]
        dataframe_data = pd.DataFrame(self.value)
        # print('df data')
        # print(dataframe_data)
        dataframe_encoded = pd.DataFrame(data=self.data_encoded,
                                        columns=encoded_columns+['cid'])
        # print('df encoded')
        # print(dataframe_encoded)
        dataframe_merged = pd.merge(dataframe_data, dataframe_encoded, on='cid', how='inner')
        # print(dataframe_merged.head())
        probs           = dataframe_merged['prob'].values
        intensity       = dataframe_merged['inte'].values
        # print(intensity)
        # print(intensity.shape)
        intensity = (intensity-np.min(intensity))/(np.max(intensity)-np.min(intensity)) # solo para mejorar la precision de la probabilidad
        rank            = np.argsort((1-self.alpha_mf)*probs+self.alpha_mf*intensity)
        rank_percent    = int(probs.shape[0]*(self.pct_mf/100))

        #rank_percent = int(probs.shape[0]*0.01)

        myPro           = probs[rank[-1:-rank_percent:-1]]
        dataframe_final = dataframe_merged[dataframe_merged.prob.isin(myPro)]
        dataframe_no_hs = dataframe_merged[~dataframe_merged.prob.isin(myPro)]
        dataframe_no_hs = dataframe_no_hs[['prob','inte']].to_dict('records')
        percentage = 10
        k = len(dataframe_no_hs) * percentage // 100
        indicies = random.sample(range(len(dataframe_no_hs)), k)
        new_list1 = [dataframe_no_hs[i] for i in indicies]
        self.non_hotspots = new_list1
        E_coords = dataframe_final[encoded_columns].values
        clustering = hdbscan.HDBSCAN(algorithm='best', alpha=1.0, approx_min_span_tree=True, gen_min_span_tree=True, leaf_size=40,metric='euclidean', min_cluster_size=5, min_samples=None, p=None).fit(E_coords)
        dataframe_final['class'] = clustering.labels_
        nclasses = np.unique(clustering.labels_)
        # print('Classes')
        # print(dataframe_final['class'].value_counts())
        X = dataframe_final[encoded_columns].values
        Y = dataframe_final['class'].values
        reducer = umap.UMAP(n_neighbors=15,min_dist=0.1,metric='euclidean') # random_state=42)
        reducer.fit(X)
        embedding = reducer.transform(X)
        dataframe_final['x'] = embedding[:,0]
        dataframe_final['y'] = embedding[:,1]

        self.calculated_hotspots = len(dataframe_final.values)
        self.calculated_crimes = 0
        temp_cc = 0
        # print(dataframe_final)
        for x in dataframe_final.values:
            temp_cc += int(sum(self.data_time_series[x[0]]))
        self.calculated_crimes = temp_cc
        # print('CALCULATED CRIMES/HOTSPOTS', self.calculated_crimes, self.calculated_hotspots)

        # GEO ARRANGEMENT FUNCTIONS
        W = 40
        H = 20
        #-------------- modifications
        nclasses = pd.DataFrame(dataframe_final['class'].value_counts())
        nclasses = nclasses.sort_index(axis=0)
        try:
            nclasses = nclasses.drop(-1)
        except:
            pass

        nclasses = nclasses.reset_index()
        nclasses.columns = ['class', 'count']
        a   = np.array(nclasses['count'].values)
        temporalSeriesClases = {};
        data = []
        for index, row in nclasses.iterrows():
            temp = dataframe_final[dataframe_final['class']==(index)]
            cids = temp['cid'].values.tolist()
            temp2 = []
            for cid in cids:
                temp2.append(self.data_time_series[cid])
            # temp2 = temp[encoded_columns]
            my_mean = np.mean(temp2, axis=0)
            #-------------------
            alpha = 0.05
            df = len(temp2) - 1
            t = stats.t.ppf(1 - alpha/2, df)   # t-critical value for 95% CI = 2.093
            s = np.std(temp2, ddof=1)
            n = len(temp2)
            
            lower = my_mean - (t * s / np.sqrt(n))
            lower[lower < 0] = 0
            upper = my_mean + (t * s / np.sqrt(n))
            upper = [upper[i]  if my_mean[i] > 0 else 0 for i in range(len(upper))]
            #-------------------
            data.append(np.array(my_mean))
            temporalSeriesClases[index]={'lower': np.round(np.array(lower),4), 'upper':np.round(np.array(upper),4),'mean':np.round(np.array(my_mean),4)}

        # print('TEMPORAL SERIES CLASSES')            
        # print(temporalSeriesClases)
        df=pd.DataFrame(data)
        # print('DF')
        # print(df)
        s = pd.DataFrame(distance_matrix(df.values, df.values), index=df.index, columns=df.index).values
        try:
            '''idx = np.argsort(-a)
            na = a[idx]
            ndata = [data[i] for i in idx]
            ns = s[idx,:][:,idx]'''
            idx = np.argsort(-a)
            original_idx = np.argsort(idx)
            a[idx][original_idx]
            #idx = np.argsort(-a)
            na = a#[idx]
            ndata = data#[data[i] for i in idx]
            ns = s#[idx,:][:,idx]
            geoA = geometricArrPlot(np.sqrt(na/na.max()),
                                W=W, H=H, data=ndata, s=ns,
                                timeLimit=5*8, minGap=0.01, relaxUsage=0.1, relaxCompact=0.00, usagePriority=1000,
                                optReading=True, optSimilarity=False)
            geoA.buildModel()
            geoA.optimize()
            '''geoA = geometricArrPlot(np.sqrt(na/na.max()),
                                W=W, H=H, data=ndata, s=ns,
                                timeLimit=800, minGap=0.01, relaxUsage=0.1, relaxCompact=1,
                                optReading=False, optSimilarity=False, keepOrdering='by_size')'''
            #geoA.buildModel()
            #geoA.optimize()

            respuesta =[]
            j = 0
            for ref, sides in geoA.boxes:
                axis = [*(ref-sides/2),sides[0],sides[1]] 
                serie = np.array(data[j])
                serieArray=[]
                for i in range(len(serie)):
                    serieArray.append({"month":i,"value":serie[i]})
                respuesta.append({"class":j,"x":round(axis[0],4),"y":round(axis[1],2),"with":round(axis[2],2),"height":round(axis[3],2),"serie":temporalSeriesClases[j]})#"serie":serieArray})
                j+=1
            self.data_cluster_mean = respuesta
        except Exception as e:
            print(e)
        self.data_cluster = dataframe_final.to_dict('records')   # lo dejo para el final porque el front se renderiza cuando esta variable cambia
        return self

    @observe('selected_ids')
    def update_selection(self, value):
        if len(self.selected_ids) == 0:
            self.current_time_series = []
            self.selected_crimes = 0
            self.selected_hotspots = 0
            self.current_selection = []
        else:
            new_values = []
            for i in self.selected_ids:
                for val in self.data_cluster:
                    if int(i) == val['cid']:
                        new_values.append(val)
                        break
            new_time_series = []
            self.selected_hotspots = len(self.selected_ids)
            for i in self.selected_ids:
                values = self.data_time_series[int(i)]
                self.selected_crimes += int(sum(values))
                data_array = []
                for idx in range(len(values)):
                    data_array.append({
                        'month':idx,
                        'value': values[idx]
                    })
                new_time_series.append({
                    'id': int(i),
                    'data': data_array
                    }
                )
            # print("selected nodes", len(self.current_selection))
            # print("selected time series", len(self.current_time_series))
            # print('SELECTED CRIMES/HOTSPOTS', self.selected_crimes, self.selected_hotspots)
            self.current_selection = new_values
            self.current_time_series = new_time_series
        return self

    @observe('selected_class')
    def update_selected_class(self, value):
        new_time_series = []
        new_values = []
        for data in self.data_cluster:
            if data['class'] == self.selected_class:
                new_values.append(data)
                values = self.data_time_series[data['cid']]
                data_array = []
                for idx in range(len(values)):
                    data_array.append({
                        'month':idx,
                        'value': values[idx]
                    })
                new_time_series.append({
                    'id': data['cid'],
                    'data': data_array
                    }
                )
        self.current_selection = new_values
        self.current_time_series = new_time_series

    @observe('clicked_dot')
    def search_clicked_hotspot(self, value):
        if self.clicked_dot != -1:
            base_data = self.data_time_series[self.clicked_dot]
            new_selected_hs = []
            for i,bd in enumerate(base_data):
                new_selected_hs.append({
                    'month': i+1,
                    'value':bd
                })
            self.selected_hotspot_series = new_selected_hs
            curr_lat = None
            curr_lng = None
            curr_class = None
            for rec in self.data_cluster:
                if rec['cid'] == self.clicked_dot:
                    curr_lat = rec['lat']
                    curr_lng = rec['lng']
                    curr_class = rec['class']
                    break
            # print(rec['cid'], curr_lat, curr_lng, curr_class)
            self.get_images(rec['cid'], curr_lat, curr_lng)

        else:
            self.selected_hotspot_series = []
            self.current_images = []

    def get_images(self, cid, lat, lng):
        API_key = "AIzaSyB7GGN5aFA-KDyq7Bi3GT3aQfOzCqz7d6E"
        images = []
        for i in range(5):
            images.append({
                'year': random.randint(2006, 2017),
                'month': random.randint(1, 12),
                'bytes': b''
        })
        # images = [random.randint(0,20)]# image_download.download_panorama(lat,lng, API_key=API_key,posName=str(cid))
        images = image_download.download_panorama(lat,lng, API_key=API_key,posName=str(cid))
        # print('images ready')
        # print('images')
        # print(images)
        self.current_images = images




@widgets.register
class Simplemap(widgets.DOMWidget):
    """An example widget."""

    # Name of the widget view class in front-end
    _view_name = Unicode('SimplemapView').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('SimplemapModel').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('0.1.0').tag(sync=True)
    # Version of the front-end module containing widget model
    _model_module_version = Unicode('0.1.0').tag(sync=True)
    
    _div_name = Unicode().tag(sync=True)

    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.
    values = List([]).tag(sync=True)
    radius = Int(0).tag(sync=True)
    opacity = Float(0.0).tag(sync=True)
    elevation = Float(0.0).tag(sync=True)


    def initialize(self, dataset, radius, opacity, elevation,is_str=False):
        final_list = []
        for d in dataset:
            lng = d[-1]
            lat = d[-2]
            if is_str:
                lng = float(d[-1].replace(',','.'))
                lat = float(d[-2].replace(',','.'))
            final_list.append({
                'lng': lng,
                'lat': lat
            })
        self.values = final_list
        self.radius = radius
        self.opacity = opacity
        self.elevation = elevation
        self._div_name = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
        return self

@widgets.register
class Simplemap2(widgets.DOMWidget):
    """An example widget."""

    # Name of the widget view class in front-end
    _view_name = Unicode('Simplemap2View').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('Simplemap2Model').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('0.1.0').tag(sync=True)
    # Version of the front-end module containing widget model
    _model_module_version = Unicode('0.1.0').tag(sync=True)
    
    _div_name = Unicode().tag(sync=True)

    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.
    values = List([]).tag(sync=True)
    radius = Int(0).tag(sync=True)
    opacity = Float(0.0).tag(sync=True)

    def initialize(self, dataset, radius, opacity):
        final_list = []
        for d in dataset:
            cant = d[0]
            lng = d[-1]
            lat = d[-2]
            final_list.append({
                'cant': cant,
                'lng': lng,
                'lat': lat
            })
        self.values = final_list
        self.radius = radius
        self.opacity = opacity
        self._div_name = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
        return self


@widgets.register
class ComparisonMap(widgets.DOMWidget):
    """An example widget."""

    # Name of the widget view class in front-end
    _view_name = Unicode('ComparisonMapView').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('ComparisonMapModel').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('jupyter_d3_widget').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('6.6.6').tag(sync=True)
    # Version of the front-end module containing widget model
    _model_module_version = Unicode('6.6.6').tag(sync=True)
    
    _div_name = Unicode().tag(sync=True)

    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.
    datasets = List([]).tag(sync=True)
    names = List([]).tag(sync=True)
    radius = Int(0).tag(sync=True)
    opacity = Float(0.0).tag(sync=True)
    elevation = Float(0.0).tag(sync=True)


    def initialize(self, datasets, names, radius, opacity, elevation):
        self.datasets = [x.to_dict('records') for x in datasets]
        self.radius = radius
        self.opacity = opacity
        self.elevation = elevation
        self._div_name = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
        return self