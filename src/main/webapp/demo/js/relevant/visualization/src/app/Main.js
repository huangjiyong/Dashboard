﻿﻿"use strict";
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["src/layout/Surface", "src/layout/Tabbed", "src/layout/Grid", "src/other/Comms", "src/graph/Graph", "src/graph/Edge", "src/graph/Vertex", "src/other/Table", "src/chart/Column", "src/other/Persist"], factory);
    }
}(this, function (Surface, Tabbed, Grid, Comms, Graph, Edge, Vertex, Table, Column, Persist) {
    function Main(target) {
        Grid.call(this);

        this.vertices = [];
        this.vertexMap = {};
        this.edges = [];
        this.edgeMap = {};
        this.claimMap = {};

        var context = this;
        var group_ids = null;
        var group_type_id = null;       
        
        this.claimsChart = new Column()
            .columns([obj.date, obj.amount])
            .selectionMode(true)
            .xAxisType("time")
            .xAxisTypeTimePattern("%Y-%m-%d %H:%M:%S")
            .yAxisType("none")
        ;
        this.claimsChart.selection = function (selected) {
            var selectionMap = {};
            var vertexMap = {};
            var edgeMap = {};
            var selection = selected.map(function (row) {
                var vertex = row[2];
                selectionMap[vertex.id()] = vertex;
                vertexMap[vertex.id()] = vertex;
                var tmp = context.graph.getNeighborMap(vertex);
                for (var key in tmp.vertices) {
                    vertexMap[key] = tmp.vertices[key];
                }
                for (var ekey in tmp.edges) {
                    edgeMap[ekey] = tmp.edges[ekey];
                }
                return vertex;
            });

            context.graph
                .selection(selection)
                .highlightVerticies(vertexMap)
                .highlightEdges(edgeMap)
                .render()
            ;
            context.graph.graph_selection(selection);
        }

        this.graph = new Graph()
            .layout("ForceDirected")
            .hierarchyRankDirection("TB")
            .hierarchyNodeSeparation(20)
            .hierarchyRankSeparation(10)
            .applyScaleOnLayout(false)
            .highlightOnMouseOverVertex(true)
        ;
        this.graph.vertex_dblclick = function (d) {
            d3.event.stopPropagation();
            context._query(d._id, d.element());
        };
        this.graph.graph_selection = function (selection) {
            context.populateTableV(context.selectionTable, selection);
            context.allTable.selection(selection.map(function (vertex) {
                return vertex.__allTableRowIdx;
            })).render();
            context.claimsTable.selection(selection.map(function (vertex) {
                return vertex.__claimsTableRowIdx;
            })).render();
        };
        this.graph.vertex_click = function (d) {
            this.graph_selection(this.selection());
           $(".common_Widget.common_HTMLWidget.other_Table").first().css("overflow", "auto");
        };
        this.graph.edge_click = function (d) {
            var source = d.sourceVertex();
            var target = d.targetVertex();
            alert(obj.edge+":  " + source.id() + "->" + target.id());
        };
        this.selectionTable = new Table()
            .fixedHeader(true)
            .fixedColumn(true)
            .fixedSize(true)
        ;

        //  Bottom Tabs/Tables  ---
        function attachClickEvent(table) { 
            table.click = function (row, col) {
                var selection = this.selection().map(function (item) {
                    return item[item.length - 1];
                });
                context.graph
                    .selection(selection)
                    .render()
                ;
                context.populateTableV(context.selectionTable, selection);
            };
        }

        this._allTableFilter = "all";
        this.allTable = new Table()
            .fixedHeader(true)
            .fixedColumn(true)
        ;
        attachClickEvent(this.allTable);
        this.claimsTable = new Table()
            .fixedHeader(true)
            .fixedColumn(true)
        ;
        attachClickEvent(this.claimsTable);
        this.peopleTable = new Table()
            .fixedHeader(true)
            .fixedColumn(true)
        ;
        attachClickEvent(this.peopleTable);
        this.policiesTable = new Table()
            .fixedHeader(true)
            .fixedColumn(true)
        ;
        attachClickEvent(this.policiesTable);
        this.vehiclesTable = new Table()
            .fixedHeader(true)
            .fixedColumn(true)
        ;
        attachClickEvent(this.vehiclesTable);

        this.vertexTabs = new Tabbed()
            .addTab(this.allTable, obj.all)
            .addTab(this.claimsTable, obj.claims)
            .addTab(this.peopleTable, obj.people)
            .addTab(this.policiesTable, obj.policies)
            .addTab(this.vehiclesTable, obj.vehicle)
        ;

        //  Main Grid  ---
        this
        	.surfacePadding(0) // need to keep this
            .setContent(0, 0, this.claimsChart, "", 1, 4)
            .setContent(1, 0, this.graph, "", 6, 4)
            .setContent(0, 4, this.selectionTable, obj.selection, 7, 1.23)
            .setContent(7, 0, this.vertexTabs, "", 3, 5.22)
        ;
    }
    Main.prototype = Object.create(Grid.prototype);
    Main.prototype._class += " app_Main";

    Main.prototype.publish("url", "", "string", "Roxie URL");

    Main.prototype.showSelection = function (_) {
        if (_) {
            this.getCell(7, 0).gridColSpan(5);
            this.setContent(0, 0, this.claimsChart, "", 1, 4);
            this.setContent(1, 0, this.graph, "", 6, 4);
            this
                .setContent(0, 4, this.selectionTable, obj.selection, 7, 1.23)
                .render()
            ;
        } else {
            this.getCell(7, 0).gridColSpan(4);
            this.setContent(0, 0, this.claimsChart, "", 1, 5.2);
            this.setContent(1, 0, this.graph, "", 6, 4);            
            this
                .setContent(0, 4, null)
                .render()
            ;
        }
        return this;
    };

    Main.prototype.filterEntities = function (filter) {
        this._allTableFilter = filter;
       	this.populateTableH(this.allTable, this.vertices);
    };

    Main.prototype.getVertex = function (id, faChar, label, data) {
        var retVal = this.vertexMap[id];
        if (!retVal) {
            retVal = new Vertex()
                .id(id)
                .text(label)
                .faChar(faChar)
                .data(data)
            ;
            this.vertexMap[id] = retVal;
            this.vertices.push(retVal);
        }
        return retVal;
    };

    Main.prototype.getEdge = function (source, target, label) {
        var id = source._id + "_" + target._id;
        var retVal = this.edgeMap[id];
        if (!retVal) {
            retVal = new Edge()
                .id(id)
                .sourceVertex(source)
                .targetVertex(target)
                .sourceMarker("circleFoot")
                .targetMarker("arrowHead")
                .text(label || "")
            ;
            this.edgeMap[id] = retVal;
            this.edges.push(retVal);
        } else {
            if (retVal.text().indexOf(label) < 0) {
                retVal += " " + label;
            }
        }
        return retVal;
    };

    Main.prototype.populateTableV = function (table, selection) {
        var columns = [obj.property];
        var propIdx = {};
        var data = [];
        selection.forEach(function (item, idx) {
            columns.push(item.text());
            var props = item.data();
            for (var key in props) {
                var row = null;
                if (propIdx[key] === undefined) {
                    propIdx[key] = data.length;
                    row = [obj[key]];
                    row.length = selection.length + 1;
                    data.push(row);
                } else {
                    row = data[propIdx[key]];
                }
                row[idx + 1] = props[key];
            }
        });
        table
            .columns(columns)
            .data(data)
            .render()
        ;        
    };

    Main.prototype.populateTableH = function (table, selection, filter) {
        filter = filter || this._allTableFilter;
        var columns = [obj.entity];
        var entityIdx = {};
        var propIdx = {};
        var data = [];
        var filteredSelection = selection.filter(function (vertex) {
            switch (filter) {
                case "claims":
                    return vertex.id().indexOf("c_") === 0;
                case "people":
                    return vertex.id().indexOf("p_") === 0;
                case "vehicles":
                    return vertex.id().indexOf("v_") === 0;
                case "policies":
                    return vertex.id().indexOf("pol_") === 0;
                default:
                    return true;
            }
        }, this);
        filteredSelection.forEach(function (item, idx) {
            var row = [item.text()];
            var props = item.data();
            for (var key in props) {
                if (propIdx[key] === undefined) {
                    propIdx[key] = columns.length;
                    //get the Translated header column here
                    columns.push(obj[key]);
                }
                row[propIdx[key]] = props[key];
            }
            data.push(row);
        });
        data.forEach(function (row, idx) {
			for (var col = 0; col < columns.length; ++col) {
				if (row[col] === undefined) {
					row[col] = "";
				}
			}
            row.length = columns.length + 1;
            row[columns.length] = filteredSelection[idx];
            if (table === this.allTable) {
                selection[idx].__allTableRowIdx = row;
            } else if (table === this.claimsTable) {
                selection[idx].__claimsTableRowIdx = row;
            }
        }, this);
        
        table
            .columns(columns)
            .data(data)
            .render()
        ;
    };
    
//Can be used later point while the query service is modified to return data based on input flag
    Main.prototype.translateTableHeader = function(table,colArray){
    	var origColumns = table.columns;
    	table.columns = function(colArray) {
    	  if (!arguments.length){
    		  return origColumns.apply(this, arguments);
    	  }
    	  var traslatedColumns = colArray.map(function(d) {
    		  /* translate  here */
    		  var traslatedColumn = obj[d]; 
    		  return traslatedColumn;
    		  });
    	  origColumns.call(this, traslatedColumns);
    	  return this;
    	}
    };
    
    Main.prototype.queryGroup = function (groupId,groupTypeId) {
    	console.log('groupId----------------->'+groupId);
    	console.log('groupTypeId----------------->'+groupTypeId);
    	this.group_ids = groupId;
    	this.group_type_id = groupTypeId;
        this._query("g");
    };
    Main.prototype.queryClaim = function (id) {
        this._query("c_" + id);
    };
    Main.prototype.queryPolicy = function (id) {
        this._query("pol_" + id);
    };
    Main.prototype.queryVehicle = function (id) {
        this._query("v_" + id);
    };
    Main.prototype.queryPerson = function (id) {
        this._query("p_" + id);
    };
    Main.prototype._query = function (id, element) {
        if (element) {
            element.classed("expanding", true);
        }
        var request=[] ;
        if(id !== "g"){
	        var catId = id.split("_");
	        switch (catId[0]) {
	            case "c":
	                request = { claim_ids: catId[1]};
	                break;
	            case "p":
	                request = { person_ids: catId[1]};
	                break;
	            case "pol":
	                break;
	            case "v":
	                request = { vehicle_ids: catId[1]};
	                break;
	        }
    	}

        if(this.group_ids != null && this.group_type_id != null){
        	request.group_ids = this.group_ids;
            request.group_type_id = this.group_type_id;
        }
        
        if (!request) {
            if (element) {
                element.classed("expanding", false);
                element.classed("expanded", true);
            }
        } else {
            var service = Comms.createESPConnection(this.url());
            var context = this;
            
            service.send(request, function (response) {
            	
                if (element) {
                    element.classed("expanding", false);
                    element.classed("expanded", true);
                    window.backupAppData.push(context.serializeToObject());
                }
                response.claim_list.forEach(function (item, i) {
                    var claim = context.getVertex("c_" + item.report_no, icons.claim, item.report_no, item);
                    context.claimMap[item.report_no] = {
                        date: item.accident_time,
                        amount: item.claim_amount,
                        claim: claim
                    };
                    var annotations = [];
                    if (item.road_accident && item.road_accident !== "0") {
                        annotations.push({
                            "faChar": "\uf018",
                            "tooltip": obj["roadAccident"],
                            "shape_color_fill": "darkgreen",
                            "image_color_fill": "white"
                        });
                    }
                    if (item.third_vehicle && item.third_vehicle !== "0") {
                        annotations.push({
                            "faChar": "\uf1b9",
                            "tooltip": obj["thirdVehicle"],
                            "shape_color_fill": "navy",
                            "image_color_fill": "white"
                        });
                    }
                    if (item.injury_accident && item.injury_accident !== "0") {
                        annotations.push({
                            "faChar": "\uf067",
                            "tooltip": obj["injuryAccident"],
                            "shape_color_fill": "white",
                            "shape_color_stroke": "red",
                            "image_color_fill": "red"
                        });
                    }
                    claim.annotationIcons(annotations);
                });
                response.policy_list.forEach(function (item, i) {
                    context.getVertex("pol_" + item.car_mark, icons.policy, item.car_mark, item);
                });
                response.person_list.forEach(function (item, i) {
                    context.getVertex("p_" + item.person_id, icons.person, item.person_id, item);
                });
                response.vehicle_list.forEach(function (item, i) {
                    context.getVertex("v_" + item.rack_no, icons.vehicle, item.rack_no, item);
                });
                response.claim_policy.forEach(function (item, i) {
                    context.getEdge(context.vertexMap["c_" + item.report_no], context.vertexMap["pol_" + item.car_mark], "", item);
                });
                response.claim_person.forEach(function (item, i) {
                    context.getEdge(context.vertexMap["c_" + item.report_no], context.vertexMap["p_" + item.person_id], "", item);
                });
                response.claim_vehicle.forEach(function (item, i) {
                    context.getEdge(context.vertexMap["c_" + item.report_no], context.vertexMap["v_" + item.rack_no], "", item);
                });
                response.person_policy.forEach(function (item, i) {
                    context.getEdge(context.vertexMap["pol_" + item.car_mark], context.vertexMap["p_" + item.person_id], "", item);
                });
                response.person_person.forEach(function (item, i) {
                    context.getEdge(context.vertexMap["p_" + item.lhs_person], context.vertexMap["p_" + item.rhs_person], "", item);
                });
                response.person_vehicle.forEach(function (item, i) {
                    context.getEdge(context.vertexMap["p_" + item.person_id], context.vertexMap["v_" + item.rack_no], "", item);
                });

                context.graph
                    .data({ vertices: context.vertices, edges: context.edges, merge: true })                   
                    .render()             
                    .layout(context.graph.layout(), 250)
                ;
                var claimsData = [];
                for (var key in context.claimMap) {
                    claimsData.push([context.claimMap[key].date, context.claimMap[key].amount, context.claimMap[key].claim]);
                }
                context.claimsChart
                    .data(claimsData)
                    .render()
                ;
                context.populateTableH(context.allTable, context.vertices);
                context.populateTableH(context.claimsTable, context.vertices, "claims");
                context.populateTableH(context.policiesTable, context.vertices, "policies");
                context.populateTableH(context.peopleTable, context.vertices, "people");
                context.populateTableH(context.vehiclesTable, context.vertices, "vehicles");
            });
        }
    };

    Main.prototype.render = function() {
        var retVal = Grid.prototype.render.apply(this, arguments);
        if (this._prevUrl !== this.url()) {
            this._prevUrl = this.url();
        }
        return retVal;
    }

    //  Serialization  ---
    Main.prototype.serializeToObject = function () {
        var graphData = this.graph.data();
        return {
            app: {
                vertices: this.vertices.map(function (row) { return row; }),
                edges: this.edges.map(function (row) { return row; })
            },
            graph: {
                vertices: graphData.vertices.map(function (vertex) { return vertex; }),
                edges: graphData.edges.map(function (edge) { return edge; }),
                merge: false
            },
            selectionTable: this.selectionTable.data(),
            allTable: this.allTable.data(),
            claimsChart: this.claimsChart.data()
        };
    };

    Main.prototype.deserializefromObject = function (obj) {
        this.vertices = obj.app.vertices;
        this.vertexMap = {};
        this.vertices.forEach(function (vertex) {
            this.vertexMap[vertex.id()] = vertex;
        }, this);
        this.edges = obj.app.edges;
        this.edgeMap = {};
        this.edges.forEach(function (edge) {
            this.edgeMap[edge.id()] = edge;
        }, this);
        this.graph.data(obj.graph).render();
        this.selectionTable.data(obj.selectionTable).render();
        this.allTable.data(obj.allTable).render();
        this.claimsChart.data(obj.claimsChart).render();
    };

    return Main;
}));
