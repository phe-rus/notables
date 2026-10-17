import Tauri
import Vision
import ImageIO
import UIKit
import WebKit

struct FrameArgs: Decodable { let image: String }

class CardReaderPlugin: Plugin {
    private let queue = OperationQueue()
    private var generation = 0
    private var backgroundObserver: NSObjectProtocol?

    override func load(webview: WKWebView) {
        backgroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in self?.generation += 1 }
    }

    deinit {
        if let observer = backgroundObserver { NotificationCenter.default.removeObserver(observer) }
    }

    @objc public func recognize(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(FrameArgs.self)
        guard args.image.count <= 2_000_000,
              let data = Data(base64Encoded: args.image),
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int,
              (1...2400).contains(width), (1...2400).contains(height) else {
            invoke.reject("invalid-image")
            return
        }
        let token = generation
        queue.maxConcurrentOperationCount = 1
        queue.addOperation {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = false
            do {
                try VNImageRequestHandler(data: data).perform([request])
                let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first }
                let text = String(lines.map { $0.string }.joined(separator: "\n").prefix(20_000))
                let confidence = lines.isEmpty ? 0 : lines.reduce(Float(0)) { $0 + $1.confidence } / Float(lines.count) * 100
                DispatchQueue.main.async {
                    if token == self.generation { invoke.resolve(["text": text, "confidence": confidence]) }
                    else { invoke.reject("cancelled") }
                }
            } catch {
                invoke.reject("recognition-failed")
            }
        }
    }

    @objc public func cancel(_ invoke: Invoke) {
        generation += 1
        invoke.resolve()
    }
}

@_cdecl("init_plugin_card_reader")
func initPlugin() -> Plugin { CardReaderPlugin() }
