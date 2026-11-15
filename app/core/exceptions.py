# Custom application exceptions. 

class VideoValidationError(Exception):
    """Raised when an uploaded video fails validation."""


class InferenceError(Exception):
    """Raised when ONNX inference fails."""


class ModelNotLoadedError(Exception):
    """Raised when the ONNX model has not been initialized."""
