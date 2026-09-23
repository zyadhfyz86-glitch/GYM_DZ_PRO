(function(){
  'use strict';

  const MODEL_PATH='ai-model/gymdz-ai.onnx';

  window.GYMDZ_ONNX={
    ready:false,
    session:null,

    async init(){
      if(this.ready)return true;
      if(!window.ort)return false;

      try{
        this.session=await window.ort.InferenceSession.create(MODEL_PATH,{
          executionProviders:['cpu']
        });
        this.ready=true;
        return true;
      }catch(e){
        console.error('GYMDZ_ONNX_INIT',e);
        return false;
      }
    },

    async run(features){
      if(!await this.init())return null;

      const values=Float32Array.from(features);
      const input=new window.ort.Tensor('float32',values,[1,values.length]);
      const inputName=this.session.inputNames[0];
      const output=await this.session.run({[inputName]:input});
      const outputName=this.session.outputNames[0];

      return output[outputName];
    }
  };
})();
