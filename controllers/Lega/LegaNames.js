const vocals = ["a", "e", "i", "o", "u"];

function generateMobName(type) {
    let sillabe_array = [];
    let randm_num = Math.floor(1 + Math.random() * 1);
    for (let i = 0; i < randm_num; i++) {
        let random_char = "";

        random_char = type.charAt(Math.floor(Math.random() * (type.length - 2))).toLowerCase();


        if (typeof random_char == "undefined" || random_char == "h" || random_char == "y") {
            let all_consonant = ["jung", "jif"];
            random_char = all_consonant[Math.floor(Math.random() * (1))];
        }
        if (random_char == " ") {
            let all_consonant = ["o", "u", "uu"];
            random_char = all_consonant[Math.floor(Math.random() * (all_consonant.length - 1))];
        } else if (random_char.length <= 0) {
            let all_consonant = ["i", "e", "u"];
            random_char = all_consonant[Math.floor(Math.random() * (all_consonant.length - 1))];
        }
        sillabe_array.push(generateSillaba(random_char));
    }
    random_char = type.charAt(Math.floor(Math.random() * (type.length - 1))).toLowerCase();
    sillabe_array.push(generateSillaba(random_char));


    for (let i = 1; i < sillabe_array.length; i++) {
        if (vocals.indexOf(sillabe_array[i - 1].charAt(sillabe_array[i - 1].length - 1)) < 0 && vocals.indexOf(sillabe_array[i].charAt(0)) < 0) {
            sillabe_array[i] = vocals[Math.floor(Math.random() * (vocals.length - 1))] + sillabe_array[i];
        } else if (vocals.indexOf(sillabe_array[i - 1].charAt(sillabe_array[i - 1].length - 1)) >= 0 && vocals.indexOf(sillabe_array[i].charAt(0)) >= 0) {
            if ((Math.random() * 2) == 1) {
                sillabe_array[i] = "l" + sillabe_array[i];
            } else {
                sillabe_array[i] = "m" + sillabe_array[i];
            }
        }
    }


    if (sillabe_array.join("").length < 7 && (Math.random() * 3) <= 1) {
        console.log("> Raddoppio casuale.");
        let tmp_index = Math.floor(Math.random() * (sillabe_array.length - 1));
        let tmp_raddoppio;
        if (sillabe_array[tmp_index].length == 2) {
            tmp_raddoppio = sillabe_array[Math.floor(Math.random() * (sillabe_array.length - 1))].charAt(0);
            if (tmp_raddoppio == "q") {
                tmp_raddoppio = "qu";
            }
            sillabe_array[tmp_index] += tmp_raddoppio;
        } else {
            tmp_index = Math.floor(Math.random() * (sillabe_array.length - 1));
            if (sillabe_array[tmp_index].substring(0, 1) != "q") {
                if (tmp_index != 0) {
                    sillabe_array[tmp_index] = sillabe_array[tmp_index].substring(0, 1) + sillabe_array[tmp_index].substring(0, 1) + sillabe_array[tmp_index].substring(1);
                } else {
                    tmp_index = Math.floor(Math.random() * (sillabe_array.length - 1));
                    if (sillabe_array[tmp_index].substring(0, 1) != "q") {
                        sillabe_array[tmp_index] = sillabe_array[tmp_index].substring(0, 1) + sillabe_array[tmp_index].substring(1) + sillabe_array[tmp_index].substring(1);
                    }
                }
            }


        }
        console.log("> sillabe_array: " + sillabe_array.join(""));
    } else {
        if ((Math.random() * 2) == 1) {
            console.log("> Raddoppio semplice.");
            for (let i = 0; i < sillabe_array.length; i++) {
                if (sillabe_array[i].indexOf("ll") < 0 && sillabe_array[i].indexOf("l") > 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("l") + 1) + "l" + sillabe_array[i].substring(sillabe_array[i].indexOf("l") + 1);
                } else if (sillabe_array[i].indexOf("mm") < 0 && sillabe_array[i].indexOf("m") > 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("m") + 1) + "m" + sillabe_array[i].substring(sillabe_array[i].indexOf("m") + 1);
                } else if (sillabe_array[i].indexOf("nn") < 0 && sillabe_array[i].indexOf("n") > 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("n") + 1) + "n" + sillabe_array[i].substring(sillabe_array[i].indexOf("n") + 1);
                } else if (sillabe_array[i].indexOf("pp") < 0 && sillabe_array[i].indexOf("p") > 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("p") + 1) + "p" + sillabe_array[i].substring(sillabe_array[i].indexOf("p") + 1);
                } else if (sillabe_array[i].indexOf("pi") < 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("p")) + "f" + sillabe_array[i].substring(sillabe_array[i].indexOf("p") + 1);
                }

            }
            console.log("> sillabe_array: " + sillabe_array.join(""));
        } else {
            console.log("> Raddoppio scartato.");
        }

    }

    if ((Math.random() * 6) <= 2) {
        for (let i = 0; i < sillabe_array.length; i++) {
            if (sillabe_array[i].indexOf("ii") >= 0 || sillabe_array[i].indexOf("ie") >= 0 || sillabe_array[i].indexOf("ia") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("i") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("i") + 1);
                break;
            } else if (sillabe_array[i].indexOf("oa") >= 0 || sillabe_array[i].indexOf("oe") >= 0 || sillabe_array[i].indexOf("oo") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("o") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("o") + 1);
                break;
            } else if (sillabe_array[i].indexOf("ai") >= 0 || sillabe_array[i].indexOf("ae") >= 0 || sillabe_array[i].indexOf("aa") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("a") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("a") + 1);
                break;
            } else if (sillabe_array[i].indexOf("ea") >= 0 || sillabe_array[i].indexOf("ei") >= 0 || sillabe_array[i].indexOf("ee") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("e") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("e") + 1);
                break;
            } else if (sillabe_array[i].indexOf("pi") >= 0 || sillabe_array[i].indexOf("po") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("p") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("p") + 1);
                break;
            } else if (sillabe_array[i].indexOf("gi") >= 0 || sillabe_array[i].indexOf("ga") >= 0 || sillabe_array[i].indexOf("ge") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("g") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("g") + 1);
                break;
            } else if (sillabe_array[i].indexOf("ci") >= 0 || sillabe_array[i].indexOf("ca") >= 0 || sillabe_array[i].indexOf("ce") >= 0 || sillabe_array[i].indexOf("co") >= 0) {
                sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("c") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("c") + 1);
                break;
            } else if ((Math.random() * 6) < 2) {
                if (sillabe_array[i].indexOf("fe") >= 0 || sillabe_array[i].indexOf("fi") >= 0 || sillabe_array[i].indexOf("fo") >= 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("f")) + "ph" + sillabe_array[i].substring(sillabe_array[i].indexOf("f") + 1);
                    break;
                } else if (sillabe_array[i].indexOf("te") >= 0 || sillabe_array[i].indexOf("ti") >= 0 || sillabe_array[i].indexOf("to") >= 0) {
                    sillabe_array[i] = sillabe_array[i].substring(0, sillabe_array[i].indexOf("t") + 1) + "h" + sillabe_array[i].substring(sillabe_array[i].indexOf("t") + 1);
                    break;
                }
            }
        }
    }

    let to_return = sillabe_array.join("");


    if (to_return.indexOf("g") > 0) {
        let splitted = to_return.split("");
        for (let i = 0; i < splitted.length; i++) {
            if (splitted[i] == "g") {
                if (i == (splitted.length - 1)) {
                    splitted[i] = "nahx";
                } else {
                    if (i == 0) {
                        if (vocals.indexOf(splitted[i + 1]) < 0) {
                            splitted[i] += vocals[Math.floor(Math.random() * (vocals.length - 1))];
                        }
                    } else {
                        if (vocals.indexOf(splitted[i - 1].charAt(0)) < 0 || vocals.indexOf(splitted[i + 1].charAt(0)) < 0) {
                            splitted[i] = "";
                        }
                    }
                }
            }
        }
        console.log("> Dopo il controllo della g: " + splitted.join(""));
        to_return = splitted.join("");
    }
    if (to_return.indexOf("xx") >= 0) {
        to_return = to_return.split("xx").join("cs");
    }
    if (to_return.indexOf("pc") >= 0) {
        to_return = to_return.split("pc").join("x");
    }
    if (to_return.indexOf("kr") >= 0) {
        to_return = to_return.split("kr").join("kir");
    }
    if (to_return.indexOf("df") >= 0) {
        to_return = to_return.split("df").join("d");
    }
    if (to_return.indexOf("dp") >= 0) {
        to_return = to_return.split("dp").join("p");
    }
    if (to_return.indexOf("td") >= 0) {
        to_return = to_return.split("td").join("tt");
    }
    if (to_return.indexOf("tb") >= 0) {
        to_return = to_return.split("tb").join("tt");
    }
    if (to_return.indexOf("tf") >= 0) {
        to_return = to_return.split("tf").join("tif");
    }
    if (to_return.indexOf("tl") >= 0) {
        to_return = to_return.split("tl").join("ll");
    }
    if (to_return.indexOf("tv") >= 0) {
        to_return = to_return.split("tv").join("v");
    }
    if (to_return.indexOf("vt") >= 0) {
        to_return = to_return.split("vt").join("t");
    }
    if (to_return.indexOf("fm") >= 0) {
        to_return = to_return.split("fm").join("mm");
    }
    if (to_return.indexOf("fb") >= 0) {
        to_return = to_return.split("fb").join("f");
    }
    if (to_return.indexOf("fv") >= 0) {
        to_return = to_return.split("fv").join("v");
    }
    if (to_return.indexOf("fq") >= 0) {
        to_return = to_return.split("fq").join("fuq");
    }
    if (to_return.indexOf("ln") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("ln").join("ll");
        } else {
            to_return = to_return.split("ln").join("nn");
        }
    } //sn
    if (to_return.indexOf("sn") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("sn").join("sin");
        } else {
            to_return = to_return.split("sn").join("sen");
        }
    }
    if (to_return.indexOf("ixe") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("ixe").join("xe");
        } else {
            to_return = to_return.split("ixe").join("xi");
        }
    }
    if (to_return.indexOf("kl") >= 0) {
        to_return = to_return.split("kl").join("kk");
    }
    if (to_return.indexOf("kd") >= 0) {
        to_return = to_return.split("kd").join("dd");
    }
    if (to_return.indexOf("kq") >= 0) {
        to_return = to_return.split("kq").join("cq");
    }
    if (to_return.indexOf("kw") >= 0) {
        to_return = to_return.split("kw").join("vv");
    }
    if (to_return.indexOf("kf") >= 0) {
        to_return = to_return.split("kf").join("ff");
    }
    if (to_return.indexOf("ks") >= 0) {
        to_return = to_return.split("ks").join("x");
    }
    if (to_return.indexOf("km") >= 0) {
        to_return = to_return.split("km").join("mm");
    }
    if (to_return.indexOf("kn") >= 0) {
        to_return = to_return.split("kn").join("nn");
    }
    if (to_return.indexOf("kp") >= 0) {
        to_return = to_return.split("kp").join("pp");
    }
    if (to_return.indexOf("ks") >= 0) {
        to_return = to_return.split("ks").join("ss");
    }
    if (to_return.indexOf("ox") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("ox").join("os");
        } else {
            to_return = to_return.split("ox").join("oc");
        }
    }
    if (to_return.indexOf("pb") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("pb").join("pp");
        } else {
            to_return = to_return.split("pb").join("bb");
        }
    }
    if (to_return.indexOf("ml") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("ml").join("mm");
        } else {
            to_return = to_return.split("ml").join("ll");
        }
    }
    if (to_return.indexOf("mf") >= 0) {
        to_return = to_return.split("mf").join("ff");
    }
    if (to_return.indexOf("mt") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("mt").join("mm");
        } else {
            to_return = to_return.split("mt").join("tt");
        }
    }
    if (to_return.indexOf("nm") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("nm").join("mm");
        } else {
            to_return = to_return.split("nm").join("n");
        }
    }
    if (to_return.indexOf("nl") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("nl").join("nn");
        } else {
            to_return = to_return.split("nl").join("ll");
        }
    }
    if (to_return.indexOf("nf") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("nf").join("nif");
        } else {
            to_return = to_return.split("nf").join("n");
        }
    }
    if (to_return.indexOf("nt") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("nt").join("nn");
        } else {
            to_return = to_return.split("nt").join("tt");
        }
    }
    if (to_return.indexOf("bp") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("bp").join("tt");
        } else {
            to_return = to_return.split("bp").join("t");
        }
    }
    if (to_return.indexOf("bq") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("bq").join("qu");
        } else {
            to_return = to_return.split("bq").join("bb");
        }
    }
    if (to_return.indexOf("bd") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("bd").join("bb");
        } else {
            to_return = to_return.split("bd").join("dd");
        }
    }
    if (to_return.indexOf("tq") >= 0) {
        to_return = to_return.split("tq").join("qu");
    }
    if (to_return.indexOf("oo") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("oo").join("o");
        } else {
            to_return = to_return.split("oo").join("o-Hu");
        }
    }
    if (to_return.indexOf("oe") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("oe").join("o");
        } else {
            to_return = to_return.split("oe").join("e");
        }
    }
    if (to_return.indexOf("ee") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("ee").join("e");
        } else {
            to_return = to_return.split("ee").join("ea");
        }
    }
    if (to_return.indexOf("cp") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("cp").join("cc");
        } else {
            to_return = to_return.split("cp").join("pp");
        }
    }
    if (to_return.indexOf("aa") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("aa").join("a");
        } else {
            to_return = to_return.split("aa").join("a-Ah");
        }
    }
    if (to_return.indexOf("ii") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("ii").join("i");
        } else {
            to_return = to_return.split("ii").join("io");
        }
    }
    if (to_return.indexOf("uu") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("uu").join("uth");
        } else {
            to_return = to_return.split("uu").join("u-Utha");
        }
    }
    if (to_return.length <= 6 && (Math.random() * 4) <= 3) {
        if (to_return.charAt(to_return.length - 1) == "t" || to_return.charAt(to_return.length - 1) == "p" || to_return.charAt(to_return.length - 1) == "g") {
            to_return += "h";
        }
    }
    if (to_return.charAt(to_return.length - 1) == "f") {
        if (to_return.length > 3) {
            to_return = to_return.substring(0, to_return.length - 1);
        } else {
            to_return += vocals[Math.floor(Math.random() * (vocals.length - 1))];
        }
    } else if (to_return.charAt(to_return.length - 1) == "b") {
        if (to_return.length > 3) {
            to_return = to_return.substring(0, to_return.length - 1) + "ish";
        } else {
            to_return += vocals[Math.floor(Math.random() * (vocals.length - 1))];
        }
    } else if (to_return.charAt(to_return.length - 1) == "c") {
        to_return = to_return.substring(0, to_return.length - 1) + "k";
    } else if (to_return.charAt(to_return.length - 1) == "q") {
        to_return = to_return.substring(0, to_return.length - 1) + "ch";
    } else if (to_return.charAt(to_return.length - 1) == "p") {
        to_return = to_return.substring(0, to_return.length - 1) + "san";
    } else if (to_return.substring(to_return.length - 2) == "oz") {
        to_return = to_return.substring(0, to_return.length - 3) + "ox";
    } else if (to_return.substring(to_return.length - 2) == "az") {
        to_return = to_return.substring(0, to_return.length - 2) + "ax";
    } else if (to_return.substring(to_return.length - 2) == "ez") {
        to_return = to_return.substring(0, to_return.length - 2) + "ex";
    }

    if (to_return.indexOf("iol") >= 0 || to_return.indexOf("lol") >= 0) {
        let tmp_string = to_return.split("ol").join("mo") + to_return.split("").slice(0, 2).reverse().join("");
        to_return = tmp_string.substring(0, Math.min(8, tmp_string.length));
    }
    if (to_return.indexOf("fes") >= 0 || to_return.indexOf("fig") >= 0) {
        let tmp_string = to_return.split("f").join("fu").substring(0, to_return.length - 2) + to_return.split("").slice(0, 2).reverse().join("");
        to_return = tmp_string.substring(0, Math.min(8, tmp_string.length));
    }
    if (to_return.indexOf("anal") >= 0) {
        let tmp_string = to_return.split("anal").join("al").substring(0, to_return.length - 2) + to_return.split("").slice(0, 2).reverse().join("");
        to_return = tmp_string.substring(0, Math.min(8, tmp_string.length));
    }
    if (to_return.indexOf("isis") >= 0 || to_return.indexOf("isi") >= 0) {
        let tmp_string = to_return.split("si").join("") + to_return.split("").slice(0, 2).reverse().join("");
        to_return = tmp_string.substring(0, Math.min(8, tmp_string.length));
    }
    if (to_return.indexOf("kh") >= 0) {
        if ((Math.random() * 2) == 2) {
            to_return = to_return.split("kh").join("h");
        } else {
            to_return = to_return.split("kh").join("k");
        }
    }
    if (to_return.indexOf("sex") >= 0) {
        to_return = to_return.substring(0, to_return.indexOf("sex")) + "set" + to_return.substring(to_return.indexOf("sex") + 3);
    }
    if (to_return.indexOf("dio") >= 0) {
        to_return = to_return.substring(0, to_return.indexOf("dio")) + "io" + to_return.substring(to_return.indexOf("dio") + 3);
    }
    if (to_return.indexOf("sega") >= 0) {
        to_return = to_return.substring(0, to_return.indexOf("sega")) + "se" + to_return.substring(to_return.indexOf("sega") + 4);
    }
    if (to_return.indexOf("coj") >= 0) {
        to_return = to_return.split("coj").join("toi");
    }
    if (to_return.indexOf("cogl") >= 0) {
        to_return = to_return.split("cogl").join("toh");
    }
    if (to_return.indexOf("cul") >= 0) {
        to_return = to_return.split("cul").join("dim");
    }
    if (to_return.indexOf("tett") >= 0) {
        to_return = to_return.split("tett").join("neth");
    }
    if (to_return.indexOf("diu") >= 0) {
        to_return = to_return.substring(0, to_return.indexOf("diu")) + "xi" + to_return.substring(to_return.indexOf("diu") + 3);
    }
    if (to_return.indexOf("covid") >= 0) {
        to_return = to_return.substring(0, to_return.indexOf("covid")) + "vi" + to_return.substring(to_return.indexOf("covid") + 5);
    }
    if (to_return.indexOf("loot") >= 0) {
        to_return = to_return.split("loot").join("ruth");
    }
    if (to_return.indexOf("merd") >= 0) {
        to_return = to_return.split("merd").join("me");
    }
    if (to_return.indexOf("caz") >= 0) {
        to_return = to_return.split("caz").join("zap");
    }
    if (to_return.indexOf("lm") >= 0) {
        to_return = to_return.split("lm").join("l");
    }
    if (to_return.indexOf("inith") >= 0) {
        to_return = to_return.split("inith").join("in");
    }

    if (to_return.length >= 10) {
        to_return = to_return.substring(0, 9);
    } else if (to_return.length <= 2) {
        to_return += "inith";
    }

    to_return = to_return.charAt(0).toUpperCase() + to_return.substring(1);

    return to_return;
}
module.exports.generateMobName = generateMobName

function generateSillaba(randomChar) {

    let res = "";

    let consonant;
    if (vocals.indexOf(randomChar) >= 0) {
        let all_consonant = ["b", "c", "d", "f", "g", "l", "n", "m", "q", "r", "s", "t", "v"];
        let random_index = Math.floor(Math.random() * (all_consonant.length - 1));
        consonant = all_consonant[random_index];
        if (consonant == "q") {
            if (randomChar != "u") {
                consonant = "qu";
            }
        }
        if ((Math.random() * all_consonant.length) > random_index) {
            res = consonant + "" + randomChar;
        } else if ((Math.random() * all_consonant.length) < random_index) {
            res = randomChar + "" + consonant;
        } else {
            res = randomChar;
        }
    } else {
        consonant = randomChar;
        let random_vocal = vocals[Math.floor(Math.random() * (vocals.length - 1))];

        if ((Math.random() * 2) == 1) {
            if ((Math.random() * 8) <= 3) {
                let all_consonant = ["g", "m", "z"];
                res = consonant + "" + random_vocal + all_consonant[Math.floor(Math.random() * (all_consonant.length - 1))];
            } else {
                res = consonant + "" + random_vocal;
            }
        } else {
            if ((Math.random() * 8) <= 2) {
                let all_consonant = ["b", "c", "d", "f", "g", "l", "n", "m", "p", "q", "r", "s", "t", "v", "z"];
                let random_consonant = all_consonant[Math.floor(Math.random() * (all_consonant.length - 1))];
                if (random_consonant == "q") {
                    if (random_vocal != "u") {
                        random_consonant = "qu";
                    }
                }
                res = random_consonant + "" + random_vocal + "" + consonant;
            } else {
                res = random_vocal + "" + consonant;
            }
        }
    }

    return res;
}

function getArticle(mob_info, check_gender) {
    console.log("> Articolo per " + mob_info.type_name);
    console.log("Prima lettera (vocale): " + mob_info.type_name.charAt(0).toLowerCase() + " -> " + vocals.indexOf(mob_info.type_name.charAt(0).toLowerCase()));
    console.log("> Ultima lettera: " + mob_info.type_name.charAt(mob_info.type_name.length - 1));
    let isMale;
    if (check_gender ) {
        
        console.log("> isMale: casuale, gender = "+mob_info.gender);
        if( mob_info.gender == "b"){
            if ((Math.floor(Math.random() * 2)) == 1) {
                isMale = true;
            } else {
                isMale = false;
            }
        }else{
            isMale = mob_info.gender == "f" ? false : true;
        }
        
    } else {
        console.log("> isMale: determinato (isMale = "+mob_info.isMale+")");
        isMale = mob_info.isMale;
    }
    console.log("> isMale (finale): " + isMale);


    if (vocals.indexOf(mob_info.type_name.charAt(0).toLowerCase()) >= 0) {
        let tmp_article = "l'";
        if (isMale) {
            return { det: tmp_article, indet: "un " };
        } else {
            return { det: tmp_article, indet: "un'" };
        }
    } else {
        if (!isMale) {
            return { det: "la ", indet: "una " };
        } else {
            if (mob_info.type_name.substring(0, 2).toLowerCase() == "sc" || mob_info.type_name.substring(0, 2).toLowerCase() == "st" || mob_info.type_name.substring(0, 2).toLowerCase() == "zo") {
                return { det: "lo ", indet: "uno " };
            } else {
                return { det: "il ", indet: "un " };
            }
        }
    }

}
module.exports.getArticle = getArticle


function genderFormat(gender, radix, suff_array) {
    let isMale;
    if (typeof gender == "string"){
        isMale = gender == "m" ? true : false;
    }else{
        isMale = gender;
    }
     
    if (!Array.isArray(suff_array)) {
        suff_array = ["o", "a"];
    }
    return radix + (isMale == true ? suff_array[0] : suff_array[1]);
}
module.exports.gF = genderFormat
