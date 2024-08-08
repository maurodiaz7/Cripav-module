// This file contains the javascript that is run when the notebook is loaded.
// It contains some requirejs configuration and the `load_ipython_extension`
// which is required for any notebook extension.

// Configure requirejs
if (window.require) {
    window.require.config({
        map: {
            "*" : {
                "jupyter_d3_widget": "nbextensions/jupyter_d3_widget/index",
            }
        }
    });
}

export function load_ipython_extension() { };
