import io,sys,os,time
from http.server import BaseHTTPRequestHandler,HTTPServer
from PIL import Image
from rembg import new_session,remove
M=os.environ.get("CUT_MODEL","birefnet-general-lite")
S=new_session(M,providers=["CPUExecutionProvider"])
class H(BaseHTTPRequestHandler):
    def log_message(self,*a):pass
    def do_GET(self):
        self.send_response(200);self.end_headers();self.wfile.write(b"ok")
    def do_POST(self):
        n=int(self.headers.get("content-length","0"));b=self.rfile.read(n);t=time.time()
        try:
            im=Image.open(io.BytesIO(b)).convert("RGB")
            m=remove(im,session=S,only_mask=True,post_process_mask=False)
            o=io.BytesIO();m.convert("L").save(o,"PNG");d=o.getvalue()
            print(f"cut {im.size} {time.time()-t:.1f}s",flush=True)
            self.send_response(200);self.send_header("content-type","image/png");self.send_header("content-length",str(len(d)));self.end_headers();self.wfile.write(d)
        except Exception as e:
            print("ERR",e,flush=True);self.send_response(500);self.end_headers();self.wfile.write(str(e).encode())
if __name__=="__main__":
    print("model",M,"listo",flush=True);HTTPServer(("127.0.0.1",8765),H).serve_forever()
