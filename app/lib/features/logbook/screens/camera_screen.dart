import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../../../core/theme/app_colors.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isInit = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras != null && _cameras!.isNotEmpty) {
        _controller = CameraController(_cameras![0], ResolutionPreset.high);
        await _controller!.initialize();
        if (mounted) {
          setState(() => _isInit = true);
        }
      }
    } catch (e) {
      debugPrint('Erro ao iniciar câmera: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInit || _controller == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          SizedBox.expand(
            child: CameraPreview(_controller!),
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.topLeft,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 32),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: FloatingActionButton.large(
                backgroundColor: Colors.white,
                onPressed: () async {
                  try {
                    final image = await _controller!.takePicture();
                    if (mounted) {
                      Navigator.pop(context, image.path);
                    }
                  } catch (e) {
                    debugPrint('Erro ao tirar foto: $e');
                  }
                },
                child: const Icon(Icons.camera_alt, color: Colors.black, size: 40),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
