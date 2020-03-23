(function (define) {
    define([
        "underscore",
        "backbone",
        "js/discovery/models/course_card",
        "js/discovery/models/facet_option"
    ], function (_, Backbone, CourseCard, FacetOption) {
        "use strict";
        function getFilterLength(array, param) {
            var array_dict = _.groupBy(array, element => {
                return element.data[param];
            });
            var array_length = [{}];
            var total = 0;
            _.each(array_dict, (value, key) => {
                if (key !== "" && key !== "undefined") {
                    array_length[0][key] = value.length;
                    total += value.length;
                }
            });
            array_length.push(total);
            return array_length;
        }
        return Backbone.Model.extend({
            url: "/search/course_discovery/",
            jqhxr: null,

            defaults: {
                totalCount: 0,
                latestCount: 0
            },

            initialize: function () {
                this.courseCards = new Backbone.Collection([], { model: CourseCard });
                this.facetOptions = new Backbone.Collection([], { model: FacetOption });
            },

            parse: function (response) {
                 response["results"] = response.results.filter(e => {
                    return e.data.catalog_visibility !='none';
                });
                if (window.location.href.includes("archives")) {
                    // code to filter the courses that are archive (end date is past Today's date)
		    var result= response.results.filter(e => {
                        return new Date(e.data.end) < new Date();
                    });
		    response["results"]=_.sortBy(result, function(o) { return o.data.start; }).reverse()
                    // creating new filters
                    response["total"] = response["results"].length;
                    for (const key of Object.keys(response.facets)) {
                        if (key !== "display_organization") {
                            var filtered_value = getFilterLength(response.results, key);
                            response["facets"][key]["terms"] = filtered_value[0];
                            response["facets"][key]["total"] = filtered_value[1];
                        }
                    }
                }
                if (window.location.href.includes("courses")) {
                    // code to filter the courses that are archive (end date is past Today's date)
                    var results = response.results.filter(e => {
                        if (!e.data.enrollment_end) {
                            return true
                        }
                        return new Date(e.data.enrollment_end) >= new Date();
                    });
		    response["results"]=_.sortBy(results, function(o) { return o.data.start; }).reverse()
                    // creating new filters
                    response["total"] = response["results"].length;
                    for (const key of Object.keys(response.facets)) {
                        if (key !== "display_organization") {
                            var filtered_value = getFilterLength(response.results, key);
                            response["facets"][key]["terms"] = filtered_value[0];
                            response["facets"][key]["total"] = filtered_value[1];
                        }
                    }
                }

                var courses = response.results || [];
                var facets = response.facets || {};
                this.courseCards.add(_.pluck(courses, "data"));

                this.set({
                    totalCount: response.total,
                    latestCount: courses.length
                });

                var options = this.facetOptions;
                _(facets).each(function (obj, key) {
                    _(obj.terms).each(function (count, term) {
                        options.add(
                            {
                                facet: key,
                                term: term,
                                count: count
                            },
                            { merge: true }
                        );
                    });
                });
            },

            reset: function () {
                this.set({
                    totalCount: 0,
                    latestCount: 0
                });
                this.courseCards.reset();
                this.facetOptions.reset();
            },

            latest: function () {
                return this.courseCards.last(this.get("latestCount"));
            }
        });
    });
})(define || RequireJS.define);
