# ML Kit discovers these from manifest metadata and constructs them by reflection.
-keep,allowoptimization class * implements com.google.firebase.components.ComponentRegistrar {
    public <init>();
}
