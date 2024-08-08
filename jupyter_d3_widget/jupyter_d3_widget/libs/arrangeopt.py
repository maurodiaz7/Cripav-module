# -*- coding: utf-8 -*-
"""
@author:  Marcos M. Raimundo
@email:   marcosmrai@gmail.com
@license: BSD 3-clause.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
plt.rcParams["figure.figsize"] = (20,10)

#from PIL import Image
import numpy as np
import warnings
import pandas as pd

import re
import time

from mip.model import Model, xsum, minimize
from mip.constants import BINARY, CONTINUOUS

class plotWindows():
    def __init__(self, ratio=1.0):
        self.boxes = []
        self.W = 10
        self.H = 5
        
    def show(self):
        # Create figure and axes
        self.fig, self.ax = plt.subplots()

        # Display the image
        self.ax.plot([0,self.W], [0,self.H], '.')
        i = 0
        for ref, sides in self.boxes:
            axin = self.ax.inset_axes(
                    [*(ref-sides/2),sides[0],sides[1]], transform=self.ax.transData)
            plt.setp(axin.get_xticklabels(), visible=False)
            plt.setp(axin.get_yticklabels(), visible=False)
            axin.tick_params(axis='both', which='both', length=0)
            if self.data is not None:
                axin.plot(self.data[i])
            axin.text(0.99, 0.99, i, transform=axin.transAxes, ha="right", va="top", fontsize=20)
            i+=1
        plt.axis('equal')
        
        plt.show()

    def add_box(self, ref, size, data=None):
        for box_ref, box_size in self.boxes:
            if any(np.abs(ref-box_ref)<(size+box_size)):
                warnings.warn('Overposed boxes.')
        self.boxes.append((ref,size))
        
        
from mip.callbacks import ConstrsGenerator, CutPool, IncumbentUpdater

'''
class SubTourCutGenerator(IncumbentUpdater):
    def __init__(self, n, rx, ry, delta):
        self.n = n
        self.rx = rx
        self.ry = ry
        self.delta = delta

    def generate_constrs(self, model: Model):
        delta = [v.x for v in model.vars if v.name.startswith('delta')]
        print(delta[0], model.objective_value)
        #input()
'''


class geometricArrangement():
    def __init__(self, a, W, H, s=None, data=None, ratio=3,
                 timeLimit=60, minGap=0.1, relaxUsage=0.1, relaxCompact=0.1, usagePriority=1, 
                 keepOrdering=True, optSimilarity=False, optReading=False):
        
        self.n = len(a)
        
        self.keepOrdering = keepOrdering
        if keepOrdering == 'by_size':
            self.idx = np.argsort(-a)
        else:
            self.idx = np.arange(self.n)
            
        self.original_idx = np.argsort(self.idx)
        
        if keepOrdering==False:
            warnings.warn('Remove ordering of boxes will cost more processing time.')
        
        self.W = W
        self.H = H
        
        if s is None:
            self.s = np.ones((self.n, self.n))
        else:
            self.s = s[self.idx,:][:,self.idx]
        self.a = np.array(a)[self.idx]
        self.data = data
        
        
        self.ratio = ratio
        self.timeLimit = timeLimit
        self.minGap = minGap
        
        self.deltaMax = np.sqrt(self.W*self.H/(sum(self.a**2)*self.ratio))
        
        self.relaxUsage = relaxUsage
        self.relaxCompact = relaxCompact
        self.usagePriority = usagePriority
            
        self.optSimilarity = optSimilarity
        self.optReading = optReading
        
    def buildConstraints(self):
        self.prob = Model("Visualize")
        
        self.delta = self.prob.add_var(name='delta', var_type=CONTINUOUS)
        
        self.x = [self.prob.add_var(var_type=CONTINUOUS) for i in range(self.n)]
        self.y = [self.prob.add_var(var_type=CONTINUOUS) for i in range(self.n)]

        self.d = [[self.prob.add_var(var_type=CONTINUOUS)#, lb=0.0)
                   for j in range(i+1)]
                   for i in range(self.n)]
                  

        
        delta = self.delta
        x = self.x
        y = self.y
        d = self.d

        self.ndist = 0.001
        if self.optSimilarity:
            for i in range(self.n):
                for j in range(i):
                    self.prob += (x[i]-x[j])+(y[i]-y[j]) <= d[i][j]
                    self.prob += (x[i]-x[j])-(y[i]-y[j]) <= d[i][j]
                    self.prob += -(x[i]-x[j])+(y[i]-y[j]) <= d[i][j]
                    self.prob += -(x[i]-x[j])-(y[i]-y[j]) <= d[i][j]
                    
                    self.ndist+=1
                    
        if self.optReading:
            for i in range(self.n):
                self.prob += x[i] <= d[i][i]
                self.prob += self.H-y[i] <= d[i][i]
                
                self.ndist+=1

        if self.keepOrdering:        
            self.r = [[self.prob.add_var(var_type=BINARY)
                       for i in range(self.n)]
                       for j in range(self.n)]
            r = self.r                    
            for i in range(self.n):
                for j in range(i):    
                    self.prob += x[i]-x[j] >= self.ratio*delta*(self.a[i]+self.a[j])/2-self.W*r[i][j]
                    self.prob += y[j]-y[i] >= delta*(self.a[i]+self.a[j])/2-self.H*(1-r[i][j])
                
        else:
            rx = [[self.prob.add_var(var_type=BINARY, lb=0, ub=1)
                       for i in range(self.n)]
                       for j in range(self.n)]
    
            ry = [[self.prob.add_var(var_type=BINARY, lb=0, ub=1)
                       for i in range(self.n)]
                       for j in range(self.n)]
            
            self.rx = rx
            self.ry = ry
            
            for i in range(self.n):
                for j in range(i+1, self.n):
                    self.prob += x[i]-x[j] >= self.ratio*delta*(self.a[i]+self.a[j])/2-self.W*rx[i][j]
                    self.prob += x[j]-x[i] >= self.ratio*delta*(self.a[i]+self.a[j])/2-self.W*rx[j][i]
                    
                    self.prob += y[i]-y[j] >= delta*(self.a[i]+self.a[j])/2-self.H*ry[i][j]
                    self.prob += y[j]-y[i] >= delta*(self.a[i]+self.a[j])/2-self.H*ry[j][i]
                    
                    self.prob += rx[i][j]+rx[j][i]+ry[i][j]+ry[j][i]==3

        for i in range(self.n):
            self.prob += x[i]-self.ratio*delta*self.a[i]/2>=0
            self.prob += x[i]+self.ratio*delta*self.a[i]/2<=self.W
            self.prob += y[i]-delta*self.a[i]/2>=0
            self.prob += y[i]+delta*self.a[i]/2<=self.H
            
        
    def buildObjectives(self):
        self.f1 = self.prob.add_var(name='f1', var_type=CONTINUOUS, lb=0.0)
        self.prob += self.f1 >= (self.deltaMax-self.delta)/self.deltaMax-self.relaxUsage

        self.f2 = self.prob.add_var(name='f2', var_type=CONTINUOUS, lb=0.0)
        self.prob += self.f2 >= xsum([self.a[i]*self.d[i][i] for i in range(self.n)]+\
                                     [self.s[i][j]*self.d[i][j]
                                      for i in range(self.n)
                                      for j in range(i+1)])/(self.ndist*(self.W+self.H))-self.relaxCompact
        
        self.prob.objective = minimize(self.usagePriority*self.f1+self.f2)
        self.prob.max_mip_gap = self.minGap
        self.prob.max_seconds = self.timeLimit
        self.prob.threads = -1
        
    def buildModel(self):
        self.buildConstraints()
        self.buildObjectives()
        
    def optimize(self):
        print('Starting optimization.')
        #self.prob.lazy_constrs_generator = SubTourCutGenerator(self.n, self.rx, self.ry, self.delta)
        start_time = time.perf_counter()
        self.prob.optimize()
        self.elapsed_time = time.perf_counter()-start_time
        self.status = self.prob.status
        
    @property
    def boxes(self):
        try:
            return self.__boxes
        except:
            self.__boxes = []
            delta_ = self.delta.x
            for i in self.original_idx:
                xi, yi = self.x[i].x, self.y[i].x
                sides = np.array([self.ratio*delta_*self.a[i], delta_*self.a[i]])
                self.__boxes +=[(np.array([xi, yi]), sides)]
                
            return self.__boxes
        
class geometricArrangementLex(geometricArrangement):
    def __init__(self, a, W, H, s=None, data=None, ratio=3,
                 timeLimitUsage=1, timeLimitCompact=1, minGap=0.1, threads=4,
                 keepOrdering=True, optSimilarity=False, optReading=False):
        
        self.n = len(a)
        
        self.keepOrdering = keepOrdering
        if keepOrdering == 'by_size':
            self.idx = np.argsort(-a)
        else:
            self.idx = np.arange(self.n)
            
        self.original_idx = np.argsort(self.idx)
        
        if keepOrdering==False:
            warnings.warn('Remove ordering of boxes will cost more processing time.')
        
        self.W = W
        self.H = H
        
        if s is None:
            self.s = np.ones((self.n, self.n))
        else:
            self.s = s[self.idx,:][:,self.idx]
        self.a = np.array(a)[self.idx]
        self.data = data
        
        
        self.ratio = ratio
        self.timeLimitUsage = timeLimitUsage
        self.timeLimitCompact = timeLimitCompact
        self.minGap = minGap
        
        self.deltaMax = np.sqrt(self.W*self.H/(sum(self.a**2)*self.ratio))
            
        self.optSimilarity = optSimilarity
        self.optReading = optReading
        
        self.threads = threads
        
        
    def buildObjectives(self, deltaMin=None):
        self.f1 = self.prob.add_var(name='f1', var_type=CONTINUOUS, lb=0.0)
        self.prob += self.f1 >= (self.deltaMax-self.delta)/self.deltaMax

        self.f2 = self.prob.add_var(name='f2', var_type=CONTINUOUS, lb=0.0)
        self.prob += self.f2 >= xsum([self.a[i]*self.d[i][i] for i in range(self.n)]+\
                                     [self.s[i][j]*self.d[i][j]
                                      for i in range(self.n)
                                      for j in range(i+1)])/(self.ndist*(self.W+self.H))
            
        if deltaMin is None:            
            self.prob.objective = minimize(self.f1)
            self.prob.max_seconds = self.timeLimitUsage
        else:
            self.prob += self.delta>=deltaMin
                        
            self.prob.objective = minimize(self.f1+self.f2)
            self.prob.max_seconds = self.timeLimitCompact
        
        self.prob.max_mip_gap = self.minGap
        self.prob.threads = self.threads
        
    def optimize_model(self):
        self.prob.optimize()
        self.status = self.prob.status
        
    def optimize(self):
        start_time = time.perf_counter()
        print('Optimizing usage.')
        self.buildConstraints()
        self.buildObjectives()
        self.optimize_model()
        print('Optimizing compactness.')
        self.buildObjectives(deltaMin=self.delta.x)
        self.optimize_model()
        self.elapsed_time = time.perf_counter()-start_time
        self.status = self.prob.status
        
    @property
    def boxes(self):
        try:
            return self.__boxes
        except:
            self.__boxes = []
            delta_ = self.delta.x
            for i in range(self.n):
                xi, yi = self.x[i].x, self.y[i].x
                sides = np.array([self.ratio*delta_*self.a[i], delta_*self.a[i]])
                self.__boxes +=[(np.array([xi, yi]), sides)]
                
            return self.__boxes
        
def loadData(path='./', outliers=False):
    with open(path+'numberOfElements') as filee:
        raw = [line.strip().split(',') for line in filee.readlines()[1:]]
        size = {int(line[0]):int(line[1]) for line in raw}
        
    a = np.array([size[key] for key in size], dtype=float)
        
    with open(path+'TemporalSerie.csv') as filee:
        raw = [re.split('\ *:\ *',line.strip()) for line in filee.readlines()]
        samples = {int(line[0]):np.array(line[1].split(','), dtype=float) for line in raw}
        
    data = [samples[key] for key in size]
        
    with open(path+'distanceMatrix.txt') as filee:
        d = (np.array([re.split('\t',line.strip())[1:] for line in filee.readlines()[1:]], dtype=float))
        s  = d.max()-d
        
    if not outliers:
        a = a[1:]
        data = data[1:]
        s = s[1:,:][:,1:]
        
    return a, data, s
        
def createData(n_cells, d=15, sort=True):
    k = [np.random.randint(4) for c in range(n_cells)]
    a = [1/2**ki for ki in k]
    vec = np.random.randn(n_cells, d)
    s = np.abs(np.corrcoef(vec))
    return a, s