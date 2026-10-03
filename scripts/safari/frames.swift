import AVFoundation
import CoreImage
import AppKit
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1]); let outDir = args[2]; let scale = Double(args.count > 3 ? args[3] : "0.25")!
let startMs = Int(args.count > 4 ? args[4] : "0")!
let endMs = Int(args.count > 5 ? args[5] : "999999")!
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let asset = AVURLAsset(url: url)
let track = asset.tracks(withMediaType: .video)[0]
print("fps nominal:", track.nominalFrameRate, "size:", track.naturalSize)
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(out); reader.startReading()
let ctx = CIContext()
var i = 0
while let sb = out.copyNextSampleBuffer() {
  guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
  let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb))
  if Int(t*1000) < startMs || Int(t*1000) > endMs { i += 1; continue }
  let ci = CIImage(cvPixelBuffer: pb).transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  if let cg = ctx.createCGImage(ci, from: ci.extent) {
    let rep = NSBitmapImageRep(cgImage: cg)
    let data = rep.representation(using: .png, properties: [:])!
    try! data.write(to: URL(fileURLWithPath: String(format: "%@/f%04d_%05d.png", outDir, i, Int(t * 1000))))
  }
  i += 1
}
print("frames:", i)
