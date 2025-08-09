import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TailwindV4Demo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Tailwind CSS v4 Demo
        </h1>
        <p className="text-muted-foreground mt-2">
          Testing new features and improvements in Tailwind CSS v4
        </p>
      </div>

      {/* Color System */}
      <Card>
        <CardHeader>
          <CardTitle>Color System</CardTitle>
          <CardDescription>
            Tailwind CSS v4 with CSS variables and HSL colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
              Primary
            </div>
            <div className="bg-secondary text-secondary-foreground p-4 rounded-lg text-center">
              Secondary
            </div>
            <div className="bg-muted text-muted-foreground p-4 rounded-lg text-center">
              Muted
            </div>
            <div className="bg-accent text-accent-foreground p-4 rounded-lg text-center">
              Accent
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle>UI Components</CardTitle>
          <CardDescription>
            Shadcn/ui components working with Tailwind CSS v4
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </CardContent>
      </Card>

      {/* New v4 Features */}
      <Card>
        <CardHeader>
          <CardTitle>Tailwind CSS v4 Features</CardTitle>
          <CardDescription>
            New features and improvements in v4
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2">Performance</h3>
              <p className="text-sm text-muted-foreground">
                Faster build times with new Rust-based engine
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2">CSS-first</h3>
              <p className="text-sm text-muted-foreground">
                Native CSS features with @import syntax
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2">Zero Config</h3>
              <p className="text-sm text-muted-foreground">
                Works out of the box with minimal configuration
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2">Modern CSS</h3>
              <p className="text-sm text-muted-foreground">
                Container queries, cascade layers, and more
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Design */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Design</CardTitle>
          <CardDescription>
            Testing responsive utilities in v4
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4 rounded-lg text-center"
              >
                Card {i}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

