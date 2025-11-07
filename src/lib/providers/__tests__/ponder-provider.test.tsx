import { render, screen, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import {
  PonderProvider,
  usePonder,
  usePonderClient,
} from "../ponder-provider";
import { PonderClient } from "@/lib/services/ponder-client";

// Mock PonderClient
jest.mock("@/lib/services/ponder-client");

describe("PonderProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_PONDER_API_URL: "http://localhost:42069",
    };
    (PonderClient as jest.MockedClass<typeof PonderClient>).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Provider initialization", () => {
    it("should render children when baseUrl is provided", () => {
      render(
        <PonderProvider baseUrl="http://test-api.com">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });

    it("should render children when NEXT_PUBLIC_PONDER_API_URL is set", () => {
      render(
        <PonderProvider>
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });

    it("should create PonderClient with baseUrl from props", () => {
      render(
        <PonderProvider baseUrl="http://custom-api.com">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "http://custom-api.com",
        })
      );
    });

    it("should create PonderClient with baseUrl from env if prop not provided", () => {
      render(
        <PonderProvider>
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "http://localhost:42069",
        })
      );
    });

    it("should render error UI when neither baseUrl prop nor env var is set", () => {
      delete process.env.NEXT_PUBLIC_PONDER_API_URL;

      render(
        <PonderProvider>
          <div>Test Child</div>
        </PonderProvider>
      );

      // Should render error UI instead of throwing
      expect(screen.getByText("Configuration Error")).toBeInTheDocument();
      expect(
        screen.getByText("NEXT_PUBLIC_PONDER_API_URL must be configured")
      ).toBeInTheDocument();
      // Should not render children when configuration is missing
      expect(screen.queryByText("Test Child")).not.toBeInTheDocument();
    });

    it("should pass apiKey from props to PonderClient", () => {
      render(
        <PonderProvider apiKey="test-api-key">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-api-key",
        })
      );
    });

    it("should pass apiKey from env if prop not provided", () => {
      process.env.NEXT_PUBLIC_PONDER_API_KEY = "env-api-key";

      render(
        <PonderProvider>
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "env-api-key",
        })
      );
    });

    it("should pass optional config props to PonderClient", () => {
      render(
        <PonderProvider
          timeout={5000}
          enableCache={true}
          cacheMaxAge={120000}
        >
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
          enableCache: true,
          cacheMaxAge: 120000,
        })
      );
    });
  });

  describe("Client memoization", () => {
    it("should not recreate client on re-render with same props", () => {
      const { rerender } = render(
        <PonderProvider baseUrl="http://test-api.com">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <PonderProvider baseUrl="http://test-api.com">
          <div>Test Child Updated</div>
        </PonderProvider>
      );

      // Should still only be called once
      expect(PonderClient).toHaveBeenCalledTimes(1);
    });

    it("should recreate client when baseUrl changes", () => {
      const { rerender } = render(
        <PonderProvider baseUrl="http://test-api.com">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledTimes(1);

      // Re-render with different baseUrl
      rerender(
        <PonderProvider baseUrl="http://new-api.com">
          <div>Test Child</div>
        </PonderProvider>
      );

      // Should be called twice (once for initial, once for change)
      expect(PonderClient).toHaveBeenCalledTimes(2);
      expect(PonderClient).toHaveBeenLastCalledWith(
        expect.objectContaining({
          baseUrl: "http://new-api.com",
        })
      );
    });

    it("should recreate client when apiKey changes", () => {
      const { rerender } = render(
        <PonderProvider apiKey="key1">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledTimes(1);

      rerender(
        <PonderProvider apiKey="key2">
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledTimes(2);
    });

    it("should recreate client when timeout changes", () => {
      const { rerender } = render(
        <PonderProvider timeout={5000}>
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledTimes(1);

      rerender(
        <PonderProvider timeout={10000}>
          <div>Test Child</div>
        </PonderProvider>
      );

      expect(PonderClient).toHaveBeenCalledTimes(2);
    });
  });

  describe("usePonder hook", () => {
    it("should return client and context value", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PonderProvider baseUrl="http://test-api.com">
          {children}
        </PonderProvider>
      );

      const { result } = renderHook(() => usePonder(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.client).toBeInstanceOf(PonderClient);
    });

    it("should throw error when used outside PonderProvider", () => {
      // Suppress console.error for this test
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePonder());
      }).toThrow("usePonder must be used within PonderProvider");

      consoleErrorSpy.mockRestore();
    });

    it("should return same client instance on multiple calls", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PonderProvider baseUrl="http://test-api.com">
          {children}
        </PonderProvider>
      );

      const { result, rerender } = renderHook(() => usePonder(), { wrapper });
      const firstClient = result.current.client;

      rerender();
      const secondClient = result.current.client;

      expect(firstClient).toBe(secondClient);
    });
  });

  describe("usePonderClient hook", () => {
    it("should return just the client instance", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PonderProvider baseUrl="http://test-api.com">
          {children}
        </PonderProvider>
      );

      const { result } = renderHook(() => usePonderClient(), { wrapper });

      expect(result.current).toBeInstanceOf(PonderClient);
    });

    it("should throw error when used outside PonderProvider", () => {
      // Suppress console.error for this test
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePonderClient());
      }).toThrow("usePonder must be used within PonderProvider");

      consoleErrorSpy.mockRestore();
    });

    it("should return same client instance as usePonder", () => {
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <PonderProvider baseUrl="http://test-api.com">
          {children}
        </PonderProvider>
      );

      function TestComponent() {
        const ponderContext = usePonder();
        const client = usePonderClient();
        return { ponderContext, client };
      }

      const { result } = renderHook(() => TestComponent(), {
        wrapper: Wrapper,
      });

      expect(result.current.client).toBe(result.current.ponderContext.client);
    });
  });

  describe("Integration scenarios", () => {
    it("should allow nested components to access client", () => {
      function ChildComponent() {
        const client = usePonderClient();
        return <div>Client: {client ? "Available" : "Not Available"}</div>;
      }

      render(
        <PonderProvider baseUrl="http://test-api.com">
          <ChildComponent />
        </PonderProvider>
      );

      expect(screen.getByText("Client: Available")).toBeInTheDocument();
    });

    it("should work with multiple nested children", () => {
      function Child1() {
        const client = usePonderClient();
        return <div>Child1: {client ? "OK" : "Fail"}</div>;
      }

      function Child2() {
        const client = usePonderClient();
        return <div>Child2: {client ? "OK" : "Fail"}</div>;
      }

      render(
        <PonderProvider baseUrl="http://test-api.com">
          <Child1 />
          <Child2 />
        </PonderProvider>
      );

      expect(screen.getByText("Child1: OK")).toBeInTheDocument();
      expect(screen.getByText("Child2: OK")).toBeInTheDocument();
    });

    it("should provide same client instance to all children", () => {
      const clients: PonderClient[] = [];

      function Child1() {
        const client = usePonderClient();
        clients.push(client);
        return <div>Child1</div>;
      }

      function Child2() {
        const client = usePonderClient();
        clients.push(client);
        return <div>Child2</div>;
      }

      render(
        <PonderProvider baseUrl="http://test-api.com">
          <Child1 />
          <Child2 />
        </PonderProvider>
      );

      expect(clients[0]).toBe(clients[1]);
    });
  });
});
