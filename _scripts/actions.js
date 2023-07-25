$(document).ready(function() {
  var width_threshold = 768;

  if(window.location.hash == "#installation") {
    setTimeout(function () {
      $("#menu-installation").trigger('click');
    }, 10);
  } else {
    setTimeout(function () {
      $("#menu-introduction").trigger('click');
    }, 10);
  }

  $(".menu-element").on("click", function() {
    $(this).parent().children().each(function() {
      $(this).removeClass("selected");
    });
    $(this).addClass("selected");

    if($(this).attr("id") == "menu-installation") {
      $("#div-introduction").hide();
      $("#div-installation").show();
      if(window.location.hash != "#installation")
        window.location.hash = "#installation";
    } else if($(this).attr("id") == "menu-introduction") {
      $("#div-introduction").show();
      $("#div-installation").hide();
      if(window.location.hash != "#introduction")
        window.location.hash = "#introduction";
    } else {
      // Do nothing
    }
  });

  $.ul_gen = function(data) {
    var ret = "<ul class\"simple\">";
    $.each(data, function(index, value) {
      ret += "<li><p>" + value + "</p></li>";
    });
    ret += "</ul>";
    return ret;
  }

  $.notes_gen = function(data, header = "Note") {
    var ret = "<div class=\"admonition note\"><p class=\"admonition-title\">" + header + "</p>";
    var ul = data.length > 1;
    if(ul) {
      ret += "<ul>";
    }
    $.each(data, function(index, value) {
      if(ul)
        ret += "<li>";
      ret += "<p>" + value + "</p>";
      if(ul)
        ret += "</li>";
    });
    if(ul) {
      ret += "</ul>";
    }
    ret += "</div>";
    return ret;
  }

  $.table_1d_gen = function(headers, data) {
    var ret = "<table border=\"1\" class=\"docutils\">";
    ret += "<tbody>";
    $.each(headers, function(index, header) {
      ret += "<tr>";
      ret += "<td><strong>" + header + "</strong></td>";
      ret += "<td>" + data[index] + "</td>";
      ret += "</tr>";
    });
    ret += "</tbody>";
    ret += "</table>";
    return ret;
  }

  $.table_2d_gen = function(data, horizontal = true) {
    var headers = [];
    $.each(data, function(index, row) {
      headers = $.merge(headers, Object.keys(row));
    });
    headers = headers.filter(function(item, i, headers) {
      return i == headers.indexOf(item);
    });
    var values = [];
    $.each(data, function(index, row) {
      var value = [];
      $.each(headers, function(index, head) {
        if(row[head] != null)
          value.push(row[head]);
        else
          value.push("-");
      });
      values.push(value);
    });

    var ret = "<table border=\"1\" class=\"docutils\">";
    if(horizontal) {
      ret += "<thead><tr>";
      $.each(headers, function(index, value) {
        ret += "<th>" + value + "</th>";
      });
      ret += "</tr></thead>";

      ret += "<tbody>";
      $.each(values, function(index, row) {
        ret += "<tr>";
        $.each(row, function(index, value) {
          ret += "<td>" + value + "</td>";
        });
        ret += "</tr>";
      });
      ret += "</tbody>";
    } else {
      ret += "<tbody>";
      $.each(headers, function(index_h, header) {
        ret += "<tr>";
        ret += "<td><strong>" + header + "</strong></td>";
        $.each(values, function(index_r, row) {
          ret += "<td>" + row[index_h] + "</td>";
        });
        ret += "</tr>";
      });
      ret += "</tbody>";
    }
    ret += "</table>";
    return ret;
  }

  $.code_gen = function(data) {
    return "<div class=\"highlight-bash notranslate\"><div class=\"highlight\"><pre>" + data.join("<br />") + "</pre></div></div>";
  }

  $.secid_gen = function(indice_main, index_sub = -1) {
    var ret = indice_main.join(".");
    if(index_sub > -1)
      ret += "[" + String.fromCharCode('a'.charCodeAt(0) + index_sub) + "]";
    ret += ". ";
    return ret;
  }

  $.pkgInArray = function(pkg, list) {
    return $.inArray(pkg, list) > -1;
  }

  $.instruction_gen = function(data) {
    var ret = "";
    var indexa = 1;
    if(data.system_requirements != null) {
      ret += "<div class=\"simple\">";
      ret += "<h2>" + $.secid_gen([indexa]) + "System Requirements</h2>";

      var indexb = 1;
      if(data.system_requirements.hardware != null) {
        ret += "<div class=\"simple\">";
        ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Hardware</h3>";

        if(data.system_requirements.hardware.support != null) { // Array of text
          ret += "<p><strong>Support:</strong></p>";
          ret += $.ul_gen(data.system_requirements.hardware.support);
        }
        if(data.system_requirements.hardware.verified != null) { // Array of text
          ret += "<p><strong>Verified on:</strong></p>";
          ret += $.ul_gen(data.system_requirements.hardware.verified);
        }
        if(data.system_requirements.hardware.notes != null) { // Array of text
          ret += $.notes_gen(data.system_requirements.hardware.notes);
        }

        ret += "</div>";
        indexb += 1;
      }
      if(data.system_requirements.software != null) {
        ret += "<div class=\"simple\">";
        ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Software</h3>";

        if(data.system_requirements.software.driver != null) {
          ret += $.table_2d_gen(data.system_requirements.software.driver);
        }

        if(!$.pkgInArray(data.package, ["docker"])) {
          var items = [];
          if(data.system_requirements.software.os != null) {
            var item = {};
            item["Software"] = "OS";
            item["Version"] = data.system_requirements.software.os.join(", ");
            items.push(item);
          }
          if(data.system_requirements.software.basekit != null) {
            var item = {};
            item["Software"] = "Intel® oneAPI Base Toolkit";
            item["Version"] = data.system_requirements.software.basekit;
            items.push(item);
          }
          if(data.system_requirements.software.basekit_hotfix != null) {
            var item = {};
            item["Software"] = "Intel® oneAPI Base Toolkit Hotfix";
            item["Version"] = data.system_requirements.software.basekit_hotfix;
            items.push(item);
          }
          if(data.system_requirements.software.python != null) {
            var item = {};
            item["Software"] = "Python";
            item["Version"] = data.system_requirements.software.python.join(", ");
            items.push(item);
          }
          if(data.system_requirements.software.compiler != null &&
             $.pkgInArray(data.package, ["source", "cppsdk"])) {
            var item = {};
            item["Software"] = "Compiler";
            item["Version"] = data.system_requirements.software.compiler;
            items.push(item);
          }
          ret += $.table_2d_gen(items);
        }

        ret += "</div>";
        indexb += 1;
      }

      ret += "</div>";
      indexa += 1;
    }
    if(data.preparation != null) {
      ret += "<div class=\"simple\">";
      ret += "<h2>" + $.secid_gen([indexa]) + "Preparation</h2>";

      var indexb = 1;
      if(data.preparation.driver != null) {
        ret += "<div class=\"simple\">";
        ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Install Driver</h3>";
        ret += $.table_2d_gen(data.preparation.driver);
        ret += "</div>";
        indexb += 1;
      }
      if(!$.pkgInArray(data.package, ["docker"])) {
        if(data.preparation.msvc != null &&
           $.pkgInArray(data.package, ["source", "cppsdk"])) {
          ret += "<div class=\"simple\">";
          ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Install Microsoft Visual Studio</h3>";
          ret += "<p>" + data.preparation.msvc + "</p>";
          ret += "</div>";
          indexb += 1;
        }
        if(data.preparation.basekit != null) {
          ret += "<div class=\"simple\">";
          ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Install Intel® oneAPI Base Toolkit</h3>";
          var notes = [];
          if(data.preparation.basekit.notinstall != null) {
            var note = "<p>Do NOT install the following Intel® oneAPI Base Toolkit components:</p>";
            note += $.ul_gen(data.preparation.basekit.notinstall);
            notes.push(note);
          }
          if(data.preparation.msvc != null &&
             $.pkgInArray(data.package, ["source", "cppsdk"]))
            notes.push("Make sure the installation includes Miscrosoft C++ Build Tools integration.");
          if(data.preparation.basekit.notes != null)
            notes = $.merge(notes, data.basekit.notes);
          ret += $.notes_gen(notes);

          if(data.preparation.basekit.install != null) {
            ret += "<p>The following Intel® oneAPI Base Toolkit components are required:</p>";
            var components = [];
            $.each(data.preparation.basekit.install, function(index, value) {
              components.push(value.name + " (Placeholder <cite>" + value.placeholder + "</cite> as its installation path)");
            });
            ret += $.ul_gen(components);
          }
          ret += "</div>";
          indexb += 1;
        }
        if(data.system_requirements.software.basekit_hotfix != null) {
          ret += "<div class=\"simple\">";
          ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Install Intel® oneAPI Base Toolkit Hotfix</h3>";
          ret += "<p>Follow the link above to install Intel® oneAPI Base Toolkit Hotfix</p>";
          ret += "</div>";
          indexb += 1;
        }
      }

      ret += "</div>";
      indexa += 1;
    }
    if(data.installation != null) {
      ret += "<div class=\"simple\">";
      ret += "<h2>" + $.secid_gen([indexa]) + "Installation</h2>";
      if(data.version_mapping != null) {
        ret += $.notes_gen(["Intel® Extension for PyTorch* " + data.version_mapping.ipex + " has to work with PyTorch*/libtorch " + data.version_mapping.pytorch + "."]);
      }

      if($.pkgInArray(data.package, ["pip", "conda"])) {
        if(data.installation.notes != null)
          ret += $.notes_gen(data.installation.notes);
        var indexb = 0;
        if(data.installation.repos != null) {
          $.each(data.installation.repos, function(index, value) {
            ret += "<div class=\"simple\">";
            if(value.repo != null) {
              var repo = value.repo;
              if(value.url != null)
                repo = "<a class=\"reference external\" href=\"" + value.url + "\">" + repo + "</a>";
              ret += "<h3>" + $.secid_gen([indexa], indexb) + repo + "</h3>";
            }
            ret += "<p>Prebuilt wheel files are available for Python " + value.python.join(", ") + ".";
            ret += $.code_gen(value.commands);
            if(value.notes != null)
              ret += $.notes_gen(value.notes);
            ret += "</div>";
            indexb += 1;
          });
        }
      } else if(data.package == "source") {
        if(data.installation.notes != null)
          ret += $.notes_gen(data.installation.notes);
        if(data.installation.aot != null)
          ret += $.notes_gen(["Refer to <a class=\"reference external\" href=\"" + data.installation.aot + "\">AOT documentation</a> for how to configure <cite>USE_AOT_DEVLIST</cite>. Without configuring AOT, the start-up time for processes using Intel® Extension for PyTorch* will be long, so this step is important."]);
        ret += "<p>To ensure a smooth compilation, a script is provided in the Github repo. If you would like to compile the binaries from source, it is highly recommended to utilize this script.</p>";
        if(data.installation.commands != null)
          ret += $.code_gen(data.installation.commands);
        ret += "<p>When compilation succeeds, directory structure should look like what is shown below.</p>";
        if(data.installation.outputs != null)
          ret += $.code_gen(data.installation.outputs);
      } else if(data.package == "docker") {
        var indexb = 1;
        var indexc = -1;
        if(data.installation.build != null && data.installation.images != null)
          indexc = 0;
        if(data.installation.build != null) {
          var secid = "";
          if(indexc == -1)
            secid = $.secid_gen([indexa, indexb]);
          else {
            secid = $.secid_gen([indexa, indexb], indexc);
            indexc += 1;
          }
          ret += "<h3>" + secid + "Build Docker Image</h3>";
          $.each(data.installation.build, function(index, value) {
            if(value.desc != null)
              ret += "<p>" + value.desc + "</p>";
            if(value.commands != null)
              ret += $.code_gen(value.commands);
          });
        }
        if(data.installation.images != null) {
          var secid = "";
          if(indexc == -1)
            secid = $.secid_gen([indexa, indexb]);
          else {
            secid = $.secid_gen([indexa, indexb], indexc);
            indexc += 1;
          }
          ret += "<h3>" + secid + "Pull Docker Image</h3>";
          $.each(data.installation.images, function(index, value) {
            if(value.desc != null)
              ret += "<p>" + value.desc + "</p>";
            if(value.commands != null)
              ret += $.code_gen(value.commands);
          });
        }
        indexb += 1;
        if(data.installation.run != null) {
          ret += "<h3>" + $.secid_gen([indexa, indexb]) + "Run Docker Image</h3>";
          ret += $.code_gen([data.installation.run]);
        }
      } else if(data.package == "cppsdk") {
        if(data.installation.files != null) {
          var headers = [];
          var values = [];
          $.each(data.installation.files, function(index, value) {
            headers.push(value.abi);
            values.push("<a href=\"" + value.url + "\">" + value.filename + "</a>");
          });
          ret += $.table_1d_gen(headers, values);
        }
        if(data.installation.commands != null) {
          $.each(data.installation.commands, function(index, value) {
            ret += $.notes_gen([value.usage + $.code_gen([value.command])], "Usage");
          });
        }
      } else {
        // Do nothing
      }

      ret += "</div>";
      indexa += 1;
    }
    if(data.sanity_test != null &&
       !$.pkgInArray(data.package, ["cppsdk"])) {
      ret += "<div class=\"simple\">";
      ret += "<h2>" + $.secid_gen([indexa]) + "Sanity Test</h2>";
      var commands = [];
      if(data.system_requirements.software.basekit != null &&
         data.preparation.basekit.install != null &&
         !$.pkgInArray(data.package, ["docker"])) {
        ret += "<p>You can run a simple sanity test to double confirm if the correct version is installed, and if the software stack can get correct hardware information onboard your system.</p>";
        $.each(data.preparation.basekit.install, function(index, value) {
          commands.push(value.env);
        });
      } else {
        ret += "<p>You can run a simple sanity test to double confirm if the correct version is installed.</p>";
      }
      commands.push(data.sanity_test);
      ret += $.code_gen(commands);
      ret += "</div>";
      indexa += 1;
    } else {
      // Do nothing
    }
    return ret;
  }

  $.row_append = function(items, num_elem = 0) {
    var stage = items[0];
    items.shift();
    var row = document.createElement("div");
    row.className = "row";
    row.setAttribute("id", "row-" + stage.toLowerCase());
    var mh = document.createElement("div");
    mh.className = "mobile-headings";
    mh.innerHTML = stage;
    row.append(mh);

    if(num_elem == 0) {
      $.each(items, function(index, value) {
        var elem = document.createElement("div");
        elem.className = "values-element install-" + stage.toLowerCase();
        elem.setAttribute("id", stage.toLowerCase() + "-" + value.toLowerCase());
        elem.innerHTML = value;
        row.append(elem);
      });
      num_elem = items.length;
    } else {
      num_elem -= 1;
      var elem_sel = document.createElement("select");
      elem_sel.className = "values-element install-" + stage.toLowerCase();
      elem_sel.setAttribute("id", stage.toLowerCase() + "-options");
      var opt = document.createElement("option");
      opt.setAttribute("value", "na");
      opt.innerHTML = "select a " + stage.toLowerCase();
      elem_sel.append(opt);
      $.each(items, function(index, value) {
        if(index < num_elem) {
          var elem = document.createElement("div");
          elem.className = "values-element install-" + stage.toLowerCase();
          elem.setAttribute("id", stage.toLowerCase() + "-" + value.toLowerCase());
          elem.innerHTML = value;
          row.append(elem);
        } else {
          var opt = document.createElement("option");
          opt.setAttribute("value", value);
          opt.innerHTML = value;
          elem_sel.append(opt);
        }
      });
      row.append(elem_sel);
      num_elem += 1;
    }
    $("#col-headings").append("<div class=\"headings-element\">" + stage + "</div>");
    $("#col-values").append(row);

    if($(document).width() >= width_threshold) {
      $(".install-" + stage.toLowerCase()).css("flex", "1 1 " + (96/num_elem) + "%");
    }
  }

  $.ajax_query = function(query) {
    var formdata = new FormData();
    formdata.append("query", query);
    $.ajax({
      cache: false,
      type: "POST",
      url: "http://ec2-52-27-27-201.us-west-2.compute.amazonaws.com/ipex-installation-guide",
      data: formdata,
      processData: false,
      contentType: false,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("error");
        console.log(textStatus);
        console.log(errorThrown);
        alert(textStatus);
      },
      success: function(data) {
        var ret = jQuery.parseJSON(data);
        if(ret.stage == "platform") {
          $.row_append($.merge(["Platform"], ret["data"]));
        } else if(ret.stage == "version") {
          var num_elem = 3;
          if(ret["data"].indexOf("Master") == -1) {
            num_elem -= 1;
          }
          $.row_append($.merge(["Version"], ret["data"]), num_elem);
        } else if(ret.stage == "os") {
          $.row_append($.merge(["OS"], ret["data"]));
        } else if(ret.stage == "package") {
          $.row_append($.merge(["Package"], ret["data"]));
        } else if(ret.stage == "instruction") {
          $("#install-instructions").html($.instruction_gen(ret["data"]));
        } else {
          // Do nothing
        }
      }
    });
  }

  var query = {};
  query.request = "platform";
  $.ajax_query(JSON.stringify(query));
  $("#col-values").on("click", ".values-element", function() {
    fields = $(this).attr("id").split("-");
    if(fields[1] == "options")
      return;
    $(this).parent().nextAll().remove();
    $("#col-headings").children().eq($(this).parent().index()).nextAll().remove();
    $("#install-instructions").html("");

    $(this).parent().children().each(function() {
      $(this).removeClass("selected");
    });
    $(this).addClass("selected");

    if(fields[0] == "platform") {
      var query = {};
      query.request = "version";
      query.platform = $(this).html();
      $.ajax_query(JSON.stringify(query));
    } else if(fields[0] == "version") {
      var query = {};
      query.request = "os";
      query.platform = $(".install-platform.selected").html();
      query.version = $(this).html();
      $.ajax_query(JSON.stringify(query));
    } else if(fields[0] == "os") {
      var query = {};
      query.request = "package";
      query.platform = $(".install-platform.selected").html();
      query.version = $(".install-version.selected").attr("id").split("-")[1];
      if(query.version == "options") {
        query.version = $("#version-options").val();
      } else {
        query.version = $(".install-version.selected").html();
      }
      query.os = $(this).html();
      $.ajax_query(JSON.stringify(query));
    } else if(fields[0] == "package") {
      var query = {};
      query.request = "instruction";
      query.platform = $(".install-platform.selected").html();
      query.version = $(".install-version.selected").attr("id").split("-")[1];
      if(query.version == "options") {
        query.version = $("#version-options").val();
      } else {
        query.version = $(".install-version.selected").html();
      }
      query.os = $(".install-os.selected").html();
      query.package = $(this).html();
      $.ajax_query(JSON.stringify(query));
    } else {
      // Do nothing
    }
  });

  $("#col-values").on("change", "select", function() {
    $(this).parent().nextAll().remove();
    $("#col-headings").children().eq($(this).parent().index()).nextAll().remove();
    $("#install-instructions").html("");

    $(this).parent().children().each(function() {
      $(this).removeClass("selected");
    });

    if($(this).val() != "na") {
      $(this).addClass("selected");

      var query = {};
      query.request = "os";
      query.platform = $(".install-platform.selected").html();
      query.version = $(this).val();
      $.ajax_query(JSON.stringify(query));
    }
  });
});