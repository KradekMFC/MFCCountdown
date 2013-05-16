"use strict";

function MFCMessage(initializer){
    var self = this;

    if ("string" === typeof(initializer)){
        //strip out newlines
        initializer = initializer.replace(/(\r\n|\n|\r)/gm, "");

        //parse out the typical pieces
        ["Type","From","To","Arg1","Arg2"].forEach(function(part){
            var delimiterPos = initializer.indexOf(" ");
            self[part] = initializer.substring(0, delimiterPos);
            initializer = initializer.substring(delimiterPos + 1)
        });

        //parse out data if there is any
        if (initializer.length > 0)

            if (self.Type != MFCMessageType.FCTYPE_LOGIN) {
                var parsed;
                try {
                    //parsed = JSON.parse(initializer.replace(/%22/g,"\""));
                    parsed = JSON.parse(decodeURIComponent(initializer));
                }
                catch(err){
                    console.log(err);
                    console.log(initializer);
                }

                self.Data = parsed;
            }
            else
                self.Data = initializer;

        //convert Type to an int
        self.Type = parseInt(self.Type,10);
    }

    if ("object" === typeof(initializer)){
        $.extend(self, initializer);
    }

    self.asMFCMessage = function asMFCMessage(){
        var msg = "{0} {1} {2} {3} {4}".format(self.Type, self.From, self.To, self.Arg1, self.Arg2);
        if (undefined !== self.Data){
            msg += " " + self.Data;
        }
        msg += "\n\0";
        return msg;
    }
}
